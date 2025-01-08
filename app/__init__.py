from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
import os

# Initialisation des extensions globales
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
login_manager.login_view = 'auth.login'

@login_manager.user_loader
def load_user(user_id):
    from .models import User  # Import dynamique pour éviter les conflits
    return User.query.get(int(user_id))

def create_app():
    # Créer l'application Flask
    app = Flask(__name__)

    # Configurer l'application avec la base de données SQLite ou PostgreSQL
    app.config.from_object("app.config.Config")

    # Initialiser les extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    # Importer les modèles
    from .models import TrackedResource, Item, Component,Recipe,RecipeComponent,ComponentsPrice, User

    # Enregistrer les routes
    from .routes import routes
    from .auth_routes import auth
    app.register_blueprint(routes)
    app.register_blueprint(auth, url_prefix='/auth')

    return app
