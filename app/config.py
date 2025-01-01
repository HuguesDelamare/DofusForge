import os

class Config:
    SQLALCHEMY_DATABASE_URI = (
        os.getenv('DATABASE_URL').replace('postgres://', 'postgresql://')
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = True
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    DEBUG = True
