# -*- encoding: utf-8 -*-
"""
Copyright (c) 2019 - present AppSeed.us
"""


import os
import secrets
from pathlib import Path
from datetime import timedelta
from apps.redis_manager import CELERY_BROKER_DB, CELERY_BACKEND_DB, SESSION_DB
import redis

class Config(object):

    BASE_DIR = Path(__file__).resolve().parent
    
    USERS_ROLES  = { 'ADMIN'  :1 , 'USER'      : 2 }
    USERS_STATUS = { 'ACTIVE' :1 , 'SUSPENDED' : 2 }

    # max upload file size
    MAX_CONTENT_LENGTH = 32 * 1024 * 1024  # 32 MB

    # enable csrf
    WTF_CSRF_ENABLED = True
    
    # celery 
    CELERY_BROKER_URL     = CELERY_BROKER_DB.str
    CELERY_RESULT_BACKEND = CELERY_BACKEND_DB.str
    CELERY_HOSTMACHINE    = "celery@app-generator"
    CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP=True
    RESULT_EXPIRES = timedelta(hours=3) 

    # redis
    SESSION_TYPE = 'redis'
    SESSION_PERMANENT = True
    SESSION_USE_SIGNER = True  # Enable session signing
    SESSION_KEY_PREFIX = 'flask_session:'  # Prefix for session keys in Redis
    SESSION_REDIS = redis.from_url(SESSION_DB.str)
    PERMANENT_SESSION_LIFETIME = timedelta(days=5)

    # Set up the App SECRET_KEY
    SECRET_KEY  = os.getenv('SECRET_KEY', secrets.token_hex(32))

    # Social AUTH context
    SOCIAL_AUTH_GITHUB  = False

    GITHUB_ID      = os.getenv('GITHUB_ID'    , None)
    GITHUB_SECRET  = os.getenv('GITHUB_SECRET', None)

    # Enable/Disable Github Social Login    
    if GITHUB_ID and GITHUB_SECRET:
         SOCIAL_AUTH_GITHUB  = True    

    GOOGLE_ID      = os.getenv('GOOGLE_ID'    , None)
    GOOGLE_SECRET  = os.getenv('GOOGLE_SECRET', None)

    # Enable/Disable Google Social Login    
    if GOOGLE_ID and GOOGLE_SECRET:
         SOCIAL_AUTH_GOOGLE  = True    

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    DB_ENGINE   = os.getenv('DB_ENGINE'   , None)
    DB_USERNAME = os.getenv('DB_USERNAME' , None)
    DB_PASS     = os.getenv('DB_PASS'     , None)
    DB_HOST     = os.getenv('DB_HOST'     , None)
    DB_PORT     = os.getenv('DB_PORT'     , None)
    DB_NAME     = os.getenv('DB_NAME'     , None)

    USE_SQLITE  = True 

    # try to set up a Relational DBMS
    if DB_ENGINE and DB_NAME and DB_USERNAME:

        try:
            
            # Relational DBMS: PSQL, MySql
            SQLALCHEMY_DATABASE_URI = '{}://{}:{}@{}:{}/{}'.format(
                DB_ENGINE,
                DB_USERNAME,
                DB_PASS,
                DB_HOST,
                DB_PORT,
                DB_NAME
            ) 

            USE_SQLITE  = False

        except Exception as e:

            print('> Error: DBMS Exception: ' + str(e) )
            print('> Fallback to SQLite ')    

    if USE_SQLITE:

        # This will create a file in <app> FOLDER
        SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'db.sqlite3')

    # __DYNAMIC_DATATB__
    # __DYNAMIC_DATATB__END

    CDN_DOMAIN = os.getenv('CDN_DOMAIN')
    CDN_HTTPS = os.getenv('CDN_HTTPS', True)


class ProductionConfig(Config):
    DEBUG = False

    # Security
    SESSION_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_DURATION = 3600

class DebugConfig(Config):
    DEBUG = True

# Load all possible configurations
config_dict = {
    'Production': ProductionConfig,
    'Debug'     : DebugConfig
}
