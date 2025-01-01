from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager, UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import os

# Initialisation des extensions globales
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
login_manager.login_view = 'auth.login'

@login_manager.user_loader
def load_user(user_id):
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
    from .models import User, ComponentsPrice, Recipe

    # Créer les tables si elles n'existent pas
    with app.app_context():
        db.create_all()

    # Enregistrer les routes
    from .routes import routes
    from .auth_routes import auth
    app.register_blueprint(routes)
    app.register_blueprint(auth, url_prefix='/auth')

    return app

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'