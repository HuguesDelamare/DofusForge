import os
from flask import app

class Config:
    BASEDIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASEDIR, 'app.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = True  # Active les logs SQL pour déboguer


app.config['DEBUG'] = True
app.config['TESTING'] = True
