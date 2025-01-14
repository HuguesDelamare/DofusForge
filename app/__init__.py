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
    """
    Fonction pour charger l'utilisateur depuis la base de données.
    """
    from app.models import User
    return User.query.get(int(user_id))

def create_app():
    """
    Crée et configure l'application Flask.
    """
    # Charger les variables d'environnement
    load_dotenv()

    # Créer l'application Flask
    app = Flask(__name__)
    app.config.from_object("app.config.Config")

    # Initialiser les extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    mail.init_app(app)

    # Enregistrer les blueprints
    from .routes import routes
    from .auth_routes import auth
    from .bounties_routes import bounties
    app.register_blueprint(routes)
    app.register_blueprint(auth, url_prefix='/auth')
    app.register_blueprint(bounties, url_prefix='/bounties')

    # Ajouter les commandes CLI
    with app.app_context():
        from app.commands import create_servers
        app.cli.add_command(create_servers)
        from app.commands import load_bounties
        app.cli.add_command(load_bounties)

    return app
