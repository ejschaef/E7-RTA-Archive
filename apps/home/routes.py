# -*- encoding: utf-8 -*-
"""
Copyright (c) 2019 - present AppSeed.us
"""

import wtforms
from apps.home import blueprint
from flask import render_template, request, redirect, url_for, session, jsonify
from flask_login import login_required
from flask_login import login_required, current_user
from apps import db, config
from apps.models import *
from apps.tasks import *
from apps.authentication.models import Users
from flask_wtf import FlaskForm
from werkzeug.exceptions import RequestEntityTooLarge
from apps.home.forms import UserQueryForm, FileUploadForm, CodeForm, SearchForm
from apps.content_manager import get_mngr
from apps.e7_utils.user_manager import fetch_user_info
from e7_rs_tools import get_battle_array
import traceback

from apps.log_management import log_utils


LOGGER = log_utils.get_logger()

########################################################################################################
# Simple Routes
########################################################################################################

@blueprint.route('/overview')
def overview():
    return render_template('pages/overview.html', segment='overview')

@blueprint.route('/icon_feather')
def icon_feather():
    return render_template('pages/icon-feather.html', segment='icon_feather')

@blueprint.route('/color')
def color():
    return render_template('pages/color.html', segment='color')

@blueprint.route('/sample_page')
def sample_page():
    return render_template('pages/sample-page.html', segment='sample_page')


@blueprint.route('/test')
def test():
    season_details = get_mngr().get_season_details_json()
    return render_template('pages/test.html', segment='test', season_details=season_details)

@blueprint.route('/search')
def search():
    form = SearchForm()
    return render_template('pages/search.html', segment='search', search_form=form)

@blueprint.route('/typography')
def typography():
    return render_template('pages/typography.html', segment='typography')

########################################################################################################
# START JS PYAPI DATA SECTION: used for getting data from E7 server to cache client side ; called from PYAPI.js file
########################################################################################################

def validate_user(uid: str | int, world_code: str, lang: str = "en") -> bool:
    """
    Validate Epic7 user information. Used for validating if user info should be obfuscated
    """
    info = fetch_user_info(uid, world_code, lang)
    if info is None: # if request fails we will not obfuscate
        return True
    return fetch_user_info(uid, world_code, lang).get("return_code") == 0

@blueprint.route('api/rs_get_battle_data', methods=["POST"])
def rs_get_battle_data() -> tuple[str, int]:
    try:
        user_dict = request.get_json()["user"]
        world_code, uid, name = user_dict["world_code"], user_dict["id"], user_dict["name"]

        if not validate_user(uid, world_code):
            return jsonify({ 'error' : f"{name} (ID: {uid}) is currently obfuscated by Smilegate" }), 403

        battle_data = get_battle_array(int(uid), world_code)
        log_msg = {
            "len" : len(battle_data),
            "world"   : world_code.split("_")[1],
            "id"      : uid,
        }
        LOGGER.info(f'{log_msg}')
        return jsonify({ 'battles' : battle_data }), 200 #Http status code Ok
    except Exception as e:
        traceback.print_exc()
        LOGGER.exception(f"Error when fetching battle data: {str(e)}")
        return jsonify({ 'error' : str(e) }), 500 #Http status code Internal Server Error


@blueprint.route('api/get_season_details')
def get_season_details() -> tuple[str, int]:
    try:
        MNGR = get_mngr()
        return jsonify({
                    "seasonDetails" : MNGR.SeasonDetailsJSON,
                    'success'       : True 
                }
            ), 200 #Http status code Ok
    except Exception as e:
        return jsonify({ 'error' : str(e), 'success' : False }), 500 #Http status code Internal Server Error
    
@blueprint.route('api/get_artifact_json')
def get_artifact_json() -> tuple[str, int]:
    try:
        MNGR = get_mngr()
        return jsonify({
                    "artifactJson" : MNGR.ArtifactJson,
                    'success'       : True 
                }
            ), 200 #Http status code Ok
    except Exception as e:
        return jsonify({ 'error' : str(e), 'success' : False }), 500 #Http status code Internal Server Error

@blueprint.route('api/get_hero_data')
def get_hero_data() -> tuple[str, int]:
    try:
        MNGR = get_mngr()
        return jsonify(MNGR.HeroManager.json), 200 #Http status code Ok
    except Exception as e:
        return jsonify({ 'error' : str(e), 'success' : False }), 500 #Http status code Internal Server Error


@blueprint.route('api/get_user_data', methods=["POST"])
def get_user_data() -> tuple[str, int]:
    try:
        MNGR = get_mngr()
        data = request.get_json()
        user_data = data["userData"]

        #split logic based on what user data is passed
        if user_data.get("name"):
            name = user_data["username"]
            world_code = user_data["server"]
            user = MNGR.UserManager.get_user_from_name(name, world_code, all_servers=False)
        else:
            user = MNGR.UserManager.get_user_from_id(int(user_data["id"]))

        if user:
            return_dict = {"user" : user.to_dict(), "success" : True, "foundUser" : user is not None }
        else:
            return_dict = {"user" : None, "success" : True, "foundUser" : user is not None }
        return jsonify(return_dict ), 200 #Http status code Ok
    except Exception as e:
        traceback.print_exc()
        return jsonify({ 'error' : str(e), 'success' : False }), 500 #Http status code Internal Server Error


########################################################################################################
# START FUNCTIONAL PAGE NAV SECTION
########################################################################################################

@blueprint.route('/loading_user_data')
def loading_user_data():
    return render_template("loading/loading_user_data.html")

@blueprint.route('/filter_syntax', methods=['GET'])
def filter_syntax():
    form = CodeForm()
    code = request.form.get('code')

    context = {'segment' : 'filter_syntax', 
               'form' : form,
               'code' : code,
    }

    return render_template('pages/filter-syntax.html', **context)

    
########################################################################################################
# START HERO STATS SECTION
########################################################################################################

@blueprint.route('/')
@blueprint.route('/index')
@blueprint.route('/home', methods=['GET'])
def home():
    filter_form = CodeForm()
    query_form = UserQueryForm()
    file_upload_form = FileUploadForm()

    code = request.form.get('code')

    context = {'segment' : 'home', 
               'filter_form' : filter_form,
               'query_form' : query_form,
               'upload_form' : file_upload_form,
               'code' : code,
    }

    return render_template('pages/home.html', **context)


########################################################################################################
# START UPLOAD BATTLE DATA SECTION
########################################################################################################

    
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
            segment = 'home'

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
    return redirect(request.referrer or url_for('home_blueprint.home'))


# Custom template filter

@blueprint.app_template_filter("replace_value")
def replace_value(value, arg):
    return value.replace(arg, " ").title()
