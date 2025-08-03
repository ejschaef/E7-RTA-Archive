# -*- encoding: utf-8 -*-
"""
Copyright (c) 2019 - present AppSeed.us
"""

from flask_wtf import FlaskForm
from flask_wtf.file import FileAllowed, FileRequired, FileField
from wtforms import StringField, SelectField, TextAreaField
from wtforms.validators import DataRequired

# login and registration

class UserQueryForm(FlaskForm):
    username = StringField('Username',
                         id='user-query-form-name',
                         validators=[DataRequired()])
    server = SelectField('Server',
                             id='user-query-form-server',
                             choices=[('world_global', "Global"),
                                      ('world_kor', "Korea"),
                                      ('world_jpn', "Japan"),
                                      ('world_asia', "Asia"),
                                      ('world_eu', "Europe"),
                                      ],
                             validators=[DataRequired()])

class FileUploadForm(FlaskForm):
    file = FileField('upload',
                         id='upload_data',
                         validators=[
                                     FileRequired(),
                                     FileAllowed(["csv"], "Only CSV Files Allowed")
                                     ]
        )

class CodeForm(FlaskForm):
    code = TextAreaField("Code", validators=[DataRequired()])


class SearchForm(FlaskForm):
    searchTerm = StringField('Search',
                         id='search-term',
                         validators=[DataRequired()])
    
    searchDomain = SelectField('Search Domain',
                             id='search-domains',
                             choices=["Global Server",
                                      "Korea Server",
                                      "Japan Server",
                                      "Asia Server",
                                      "Europe Server",
                                      "Heroes",
                                      "Artifacts"
                                      ],
                             validators=[DataRequired()])

