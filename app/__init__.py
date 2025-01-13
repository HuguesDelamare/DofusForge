from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_mail import Mail
from dotenv import load_dotenv
import os

# Extensions
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
mail = Mail()

@login_manager.user_loader
def load_user(user_id):
    from app.models import User
    return User.query.get(int(user_id))

def create_app():
    load_dotenv()
    app = Flask(__name__)
    app.config.from_object("app.config.Config")

    # Initialiser les extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    mail.init_app(app)

    # Enregistrer les blueprints
    from .routes import routes
    from .auth_routes import auth, test_email
    app.register_blueprint(routes)
    app.register_blueprint(auth, url_prefix='/auth')
    app.register_blueprint(test_email, url_prefix='/test')

    return app
