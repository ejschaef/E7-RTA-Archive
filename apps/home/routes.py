# -*- encoding: utf-8 -*-
"""
Copyright (c) 2019 - present AppSeed.us
"""

import os, json, pprint, uuid, base64
import wtforms
import jsonpickle


from apps.home import blueprint
from flask import render_template, request, redirect, url_for, session, current_app, jsonify
from flask_login import login_required
from jinja2 import TemplateNotFound
from flask_login import login_required, current_user
from apps import db, config
from apps.models import *
from apps.tasks import *
from apps.authentication.models import Users
from flask_wtf import FlaskForm
from werkzeug.exceptions import RequestEntityTooLarge
from apps.home.forms import UserQueryForm, FileUploadForm, CodeForm
from apps.e7_utils.user_manager import User
from apps.e7_utils.filter_syntax import FilterSyntaxResolver
from apps.content_manager import ContentManager
from apps.exceptions.exception import DataValidationException
from apps.references import cached_var_keys as KEYS
from apps.home.read_data import read_battle_csv
from apps.redis_manager import GLOBAL_DB

from apps.tasks import celery_app, load_user_data
from celery.result import AsyncResult

########################################################################################################
# START HELPERS
########################################################################################################

GLOBAL_CLIENT = GLOBAL_DB.get_client()


def get_mngr() -> ContentManager:
    return ContentManager.decode(GLOBAL_CLIENT.get(KEYS.CONTENT_MNGR_KEY))

def generate_short_id():
    uid = uuid.uuid4()
    short = base64.urlsafe_b64encode(uid.bytes).rstrip(b'=').decode('utf-8')
    return short

def forget_user_task_data():
    task = AsyncResult(session[KEYS.USER_DATA_TASK_ID_KEY], app=celery_app)
    task.forget()
    session.pop(KEYS.USER_DATA_TASK_ID_KEY)

def session_remove_user():
    assert "user" in session, "Tried to remove user when none is stored in session"
    session.pop('server')
    session.pop('username')
    session.pop('user')
    session.pop(KEYS.UPLOADED_BATTLES_DF, None)
    session.pop("KEY_DICT", None)
    session.pop(KEYS.CACHED_DATA_FLAG, None)
    if KEYS.USER_DATA_TASK_ID_KEY in session:
        forget_user_task_data()

def session_add_user(user: User):
    session['user']     = jsonpickle.encode(user)
    session['username'] = user.name
    session['server']   = user.world_code
    session["KEY_DICT"] = KEYS.KEY_DICT
    

########################################################################################################
# END HELPERS
########################################################################################################


@blueprint.route('/')
@blueprint.route('/index')
def index():
    data = [
            {'name': 'John Doe', 'age': 30, 'city': 'New York'},
            {'name': 'Jane Smith', 'age': 25, 'city': 'Los Angeles'},
            {'name': 'Peter Jones', 'age': 40, 'city': 'Chicago'}
        ]
    return render_template('pages/index.html', segment='index', data=data)

@blueprint.route('/icon_feather')
def icon_feather():
    return render_template('pages/icon-feather.html', segment='icon_feather')

@blueprint.route('/color')
def color():
    return render_template('pages/color.html', segment='color')

@blueprint.route('/sample_page')
def sample_page():
    return render_template('pages/sample-page.html', segment='sample_page')

@blueprint.route('/typography')
def typography():
    return render_template('pages/typography.html', segment='typography')

########################################################################################################
# START JS CACHE USER DATA SECTION: used for getting data from python to then cache client side
########################################################################################################

@blueprint.route('/api/fetch_user_data')
def fetch_user_data():
    cache_flag = session.get(KEYS.CACHED_DATA_FLAG, False)
    if cache_flag:
        # Tell client to use its cache
        return jsonify({'use_cache' : True})
    else:
        # Return fresh data
        json = jsonify(get_task_data())
        return json

@blueprint.route('api/notify_cache_success')
def notify_cache_success():
    forget_user_task_data()
    session[KEYS.CACHED_DATA_FLAG] = True
    return '', 204

########################################################################################################
# START USER QUERY SECTION
########################################################################################################

@blueprint.route('/user_query', methods=['GET', 'POST'])
def user_query():
    login_form = UserQueryForm(request.form)
    if 'user_query' in request.form:

        # read form data
        username  = request.form['username'] # we can have here username OR email
        server = request.form['server']

        MNGR = get_mngr()

        UM = MNGR.UserManager

        user = UM.get_user_from_name(username, server)

        # if user not found
        if user is None:

            return render_template('pages/user_query.html',
                                        msg=f'User: {username} not found in records for server: {server}',
                                        form=login_form)

        session_add_user(user)
        task = load_user_data.apply_async(args=[jsonpickle.encode(user), jsonpickle.encode(MNGR.HeroManager)], task_id=username+"_"+generate_short_id())
        session[KEYS.USER_DATA_TASK_ID_KEY] = task.id
        return redirect(url_for('home_blueprint.loading_user_data', task_id=task.id))

    return render_template('pages/user_query.html', form=login_form)


@blueprint.route('/loading_user_data/<task_id>')
def loading_user_data(task_id):
    if KEYS.USER_DATA_TASK_ID_KEY not in session:
        print("NO TASK STARTED")
        return redirect(url_for("home_blueprint.error_117"))
    return render_template("loading/loading_user_data.html", task_id=task_id)


@blueprint.route('/user_data_status/<task_id>')
def user_data_status(task_id):
    """
    Called within loading_user_data.html to poll status of task and redirect when done
    """
    task = AsyncResult(task_id, app=celery_app)
    print(f"TASK STATE: {task.state}")
    if task.state == "FAILURE":
        print("TASK FAILED: task result ->", task.result)
        return {'ready': False, 'failure' : True, 'redirect_url': url_for('home_blueprint.error_117')}
    elif task.ready():
        return {'ready': True, 'redirect_url': url_for('home_blueprint.hero_stats', user=session['username'])}
    else:
        return {'ready': False, 'failure' : False}
    
########################################################################################################
# START HERO STATS SECTION
########################################################################################################

def start_task(resolver: FilterSyntaxResolver=None):
    MNGR = get_mngr()
    resolver = jsonpickle.encode(resolver) if resolver is not None else resolver
    task = load_user_data.apply_async(
            args=[session['user'], jsonpickle.encode(MNGR.HeroManager)],

            kwargs={'uploaded_battles' : session.get(KEYS.UPLOADED_BATTLES_DF), 
                    'resolver'         : resolver,
                }, 
                    
            task_id=session["username"]+"_"+generate_short_id()
    )
    session[KEYS.USER_DATA_TASK_ID_KEY] = task.id
    session.pop(KEYS.CACHED_DATA_FLAG, None)
    return redirect(url_for('home_blueprint.loading_user_data', task_id=task.id))

def get_task_data() -> dict[str, object]:
    assert KEYS.USER_DATA_TASK_ID_KEY in session, "Could not find task id key in session; Can't call get_task_data unless task id is still in session."
    task_id = session.get(KEYS.USER_DATA_TASK_ID_KEY)
    task = AsyncResult(task_id, app=celery_app)
    assert task.successful(), "Cannot call get_task_data unless the task has already been verified as successful; task.successful() did not return True"
    data = task.result
    return data

@blueprint.route('/hero_stats/<user>', methods=['GET', 'POST'])
def hero_stats(user=None):
    form = CodeForm()
    code = request.form.get('code')

    if session.get("user", None) is None:
        print("No user in session")
        return redirect(url_for("home_blueprint.user_query"))

    if 'switch_user' in request.form:
        session_remove_user()
        return redirect(url_for("home_blueprint.user_query"))
    
    filter_error = None
    filter_validation_msg = None
    
    # Handle code mirror filter
    if request.method == "POST" and code is not None:
        if 'clear-filter' in request.form:
            code = session.get(KEYS.FILTER_CODE)
            if code:
                print("Cleared Filters")
                session[KEYS.FILTER_CODE] = None
                return start_task()
            else:
                print("No Filters to Clear")
        else:
            session[KEYS.FILTER_CODE] = code
            try:
                MNGR = get_mngr()
                resolver = FilterSyntaxResolver(code, MNGR.HeroManager)
                print(f"Received filters:\n\n{resolver.as_str()}\n")
                if "check-syntax" in request.form:
                    filter_validation_msg="Syntax validation passed."
                else:
                    return start_task(resolver=resolver)
            except Exception as e:
                filter_error = e
                pass
    
    MNGR = get_mngr()

    code = session.get(KEYS.FILTER_CODE, "")

    context = {'segment' : 'hero_stats', 
               'season_details' : MNGR.SeasonDetails.to_dict(orient='records'),
               'form' : form,
               'code' : code,
               'error' : str(filter_error) if filter_error else None,
               'validation_msg' : filter_validation_msg}

    print("RENDERING STATS")

    return render_template('pages/hero_stats.html', **context)


########################################################################################################
# START UPLOAD BATTLE DATA SECTION
########################################################################################################


@blueprint.route('/upload_battle_data', methods=['GET', 'POST'])
def upload_battle_data():
    upload_form = FileUploadForm()
    MNGR = get_mngr()
    if 'battle_data' in request.form and upload_form.validate_on_submit():
        # read form data
        file = upload_form.file.data
        try:
            print("TRYING TO READ FILE")
            df = read_battle_csv(file, MNGR.UserManager)
        except DataValidationException as e:
            return render_template('pages/upload_battle_data.html', form=upload_form, msg=e.message)
        
        # upload was successful

        user_id = int(df['P1 ID'][0])

        # validate user
        MNGR = get_mngr()
        UM = MNGR.UserManager
        user = UM.get_user_from_id(user_id)

        # user does not exist
        if user is None:
            return render_template('pages/upload_battle_data.html', form=upload_form, msg=f"User with ID: {user_id} does not exist")
        
        if "user" in session:
            session_remove_user()
        
        session_add_user(user)

        session[KEYS.UPLOADED_BATTLES_DF] = df.to_json()

        task = load_user_data.apply_async(args=[jsonpickle.encode(user), jsonpickle.encode(MNGR.HeroManager)],
                                          kwargs={'uploaded_battles' : df.to_json()}, 
                                          task_id=user.name+"_"+generate_short_id())
        
        session[KEYS.USER_DATA_TASK_ID_KEY] = task.id

        return redirect(url_for('home_blueprint.loading_user_data', task_id=task.id))
    
    if "FILE_SIZE_ERROR" in session:
        session.pop("FILE_SIZE_ERROR")
        max_size = current_app.config["MAX_CONTENT_LENGTH"] / 1024 / 1024
        msg = f'File is too large. Maximum allowed size is {max_size} MB.'
        return render_template('pages/upload_battle_data.html', form=upload_form, msg=msg)

    print("RENDERING NO MESSAGE")
    return render_template('pages/upload_battle_data.html', form=upload_form)


########################################################################################################
# START UPLOAD BATTLE DATA SECTION
########################################################################################################

@blueprint.route('/apply_filters', methods=['GET', 'POST'])
def apply_filters():
    form = CodeForm()
    code = request.form.get('code')
    MNGR = get_mngr()
    if request.method == "POST" and code is not None:
        try:
            resolver = FilterSyntaxResolver(code, MNGR.HeroManager)
            print(f"Received filters:\n\n{resolver.as_str()}\n")
            if "check-syntax" in request.form:
                return render_template('pages/apply_filters.html', code=code, form=form, validation_msg="Syntax validation passed.")
            else:
                df_json = session.get(KEYS.UPLOADED_BATTLES_DF)
                task = load_user_data.apply_async(args=[session['user'], jsonpickle.encode(MNGR.HeroManager)],
                                          kwargs={'uploaded_battles' : df_json, 'resolver' : jsonpickle.encode(resolver)}, 
                                          task_id=session["username"]+"_"+generate_short_id())
                session[KEYS.USER_DATA_TASK_ID_KEY] = task.id
                session[KEYS.FILTER_CODE] = code

                return redirect(url_for('home_blueprint.loading_user_data', task_id=task.id))
        except Exception as e:
            return render_template('pages/apply_filters.html', code=code, error=str(e), form=form)
    else:
        code = session.get(KEYS.FILTER_CODE, "")
        return render_template('pages/apply_filters.html', code=code, form=form)
    

def getField(column): 
    if isinstance(column.type, db.Text):
        return wtforms.TextAreaField(column.name.title())
    if isinstance(column.type, db.String):
        return wtforms.StringField(column.name.title())
    if isinstance(column.type, db.Boolean):
        return wtforms.BooleanField(column.name.title())
    if isinstance(column.type, db.Integer):
        return wtforms.IntegerField(column.name.title())
    if isinstance(column.type, db.Float):
        return wtforms.DecimalField(column.name.title())
    if isinstance(column.type, db.LargeBinary):
        return wtforms.HiddenField(column.name.title())
    return wtforms.StringField(column.name.title()) 


@blueprint.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():

    class ProfileForm(FlaskForm):
        pass

    readonly_fields = Users.readonly_fields
    full_width_fields = {"bio"}

    for column in Users.__table__.columns:
        if column.name == "id":
            continue

        field_name = column.name
        if field_name in full_width_fields:
            continue

        field = getField(column)
        setattr(ProfileForm, field_name, field)

    for field_name in full_width_fields:
        if field_name in Users.__table__.columns:
            column = Users.__table__.columns[field_name]
            field = getField(column)
            setattr(ProfileForm, field_name, field)

    form = ProfileForm(obj=current_user)

    if form.validate_on_submit():
        readonly_fields.append("password")
        excluded_fields = readonly_fields
        for field_name, field_value in form.data.items():
            if field_name not in excluded_fields:
                setattr(current_user, field_name, field_value)

        db.session.commit()
        return redirect(url_for('home_blueprint.profile'))
    
    context = {
        'segment': 'profile',
        'form': form,
        'readonly_fields': readonly_fields,
        'full_width_fields': full_width_fields,
    }
    return render_template('pages/profile.html', **context)


# Helper - Extract current page name from request
def get_segment(request):

    try:

        segment = request.path.split('/')[-1]

        if segment == '':
            segment = 'index'

        return segment

    except:
        return None
    
########################################################################################################
# START ERROR SECTION
########################################################################################################

@blueprint.route('/error-403')
def error_403():
    return render_template('error/403.html'), 403

@blueprint.errorhandler(403)
def not_found_error(error):
    return redirect(url_for('error-403'))

@blueprint.route('/error-404')
def error_404():
    return render_template('error/404.html'), 404

@blueprint.errorhandler(404)
def not_found_error(error):
    return redirect(url_for('error-404'))

@blueprint.route('/error-500')
def error_500():
    return render_template('error/500.html'), 500

@blueprint.errorhandler(500)
def not_found_error(error):
    return redirect(url_for('error-500'))

@blueprint.route('/error-117')
def error_117():
    return render_template('error/117.html')

@blueprint.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(e):
    session["FILE_SIZE_ERROR"] = True
    return redirect(request.referrer or url_for('home_blueprint.index'))


# Celery (to be refactored)
@blueprint.route('/tasks-test')
def tasks_test():
    
    input_dict = { "data1": "04", "data2": "99" }
    input_json = json.dumps(input_dict)

    task = celery_test.delay( input_json )

    return f"TASK_ID: {task.id}, output: { task.get() }"


# Custom template filter

@blueprint.app_template_filter("replace_value")
def replace_value(value, arg):
    return value.replace(arg, " ").title()
