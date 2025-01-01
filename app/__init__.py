from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os

# Initialisation des extensions globales
db = SQLAlchemy()
migrate = Migrate()

def create_app():
    # Créer l'application Flask
    app = Flask(__name__)

    # Configurer l'application avec la base de données SQLite
    app.config.from_object("app.config.Config")

    # Initialiser db et migrate
    db.init_app(app)
    migrate.init_app(app, db)

    # Importer les modèles après l'initialisation de db
    from .models import ComponentsPrice

    # Créer les tables si elles n'existent pas
    with app.app_context():
        db.create_all()

    # Enregistrer les routes
    from .routes import routes
    app.register_blueprint(routes)

    return app
