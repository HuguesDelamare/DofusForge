from datetime import datetime, timedelta, timezone
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from flask import current_app
import jwt
from app import db


class Item(db.Model):
    __tablename__ = 'items'
    id = db.Column(db.Integer, primary_key=True)  # ID unique de l'item
    name = db.Column(db.String(255), nullable=False)  # Nom de l'objet
    level = db.Column(db.Integer, nullable=False)  # Niveau de l'objet
    type = db.Column(db.String(255), nullable=False)  # Type (localisé)
    description = db.Column(db.Text, nullable=True)  # Description
    image_url = db.Column(db.String(512), nullable=True)  # URL de l'image
    item_set = db.Column(db.String(255), nullable=True)  # Nom de la panoplie (slug)

    def __repr__(self):
        return f"<Item {self.name}, level={self.level}, type={self.type}, set={self.item_set}>"

# Décrit le composant indépendamment de Item ou Recette, Composant Unique
class Component(db.Model):
    __tablename__ = 'components'
    id = db.Column(db.Integer, primary_key=True)  # ID unique du composant
    name = db.Column(db.String(255), nullable=False)  # Nom du composant
    image_url = db.Column(db.String(512), nullable=True)  # URL de l'image du composant
    description = db.Column(db.Text, nullable=True)  # Description du composant
    type = db.Column(db.String(255), nullable=True)  # Type du composant (optionnel)

    def __repr__(self):
        return f"<Component {self.name}, type={self.type}>"

class RecipeComponent(db.Model):
    __tablename__ = 'recipe_components'
    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey('items.id'), nullable=False)
    component_id = db.Column(db.Integer, db.ForeignKey('components.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)

    # Relations
    component = db.relationship('Component', backref='recipe_components', lazy=True)

    # Contrainte d'unicité
    __table_args__ = (
        db.UniqueConstraint('recipe_id', 'component_id', name='unique_recipe_component'),
    )

    def __repr__(self):
        return f"<RecipeComponent recipe_id={self.recipe_id}, component_id={self.component_id}, quantity={self.quantity}>"

class Recipe(db.Model):
    __tablename__ = 'recipes'
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('items.id'), nullable=False)
    item_name = db.Column(db.String(255), nullable=False)
    item_price = db.Column(db.Integer, nullable=False)  # Prix HDV renseigné
    item_craft_price = db.Column(db.Integer, nullable=False, default=0)  # Coût total du craft
    date_recorded = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relation avec User et Item
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    user = db.relationship('User', backref='recipes', lazy=True)
    item = db.relationship('Item', backref='recipes', lazy=True)

    def __repr__(self):
        return (
            f"<Recipe {self.id}, item_id={self.item_id}, item_name={self.item_name}, "
            f"item_price={self.item_price}, craft_price={self.item_craft_price}, "
            f"date={self.date_recorded}>"
        )

class ComponentsPrice(db.Model):
    __tablename__ = 'component_price'
    id = db.Column(db.Integer, primary_key=True)
    component_id = db.Column(db.Integer, db.ForeignKey('components.id'), nullable=False)
    component_price = db.Column(db.Integer)
    date_recorded = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc).replace(second=0, microsecond=0)
    )

    component = db.relationship('Component', backref='prices', lazy=True)

    def __repr__(self):
        return (
            f"<ComponentsPrice "
            f"id={self.id}, component_id={self.component_id}, "
            f"component_price={self.component_price}, date={self.date_recorded}>"
        )

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    is_confirmed = db.Column(db.Boolean, default=False)

    def set_password(self, password):
        """Hash le mot de passe et le stocke."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Vérifie le mot de passe en le comparant au hash stocké."""
        return check_password_hash(self.password_hash, password)

    def generate_confirmation_token(self, expires_in=3600):
        payload = {
            'user_id': self.id,  # Utilise l'ID de l'utilisateur
            'exp': datetime.utcnow() + timedelta(seconds=expires_in)
        }
        return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')


    @staticmethod
    def verify_confirmation_token(token):
        try:
            secret_key = current_app.config['SECRET_KEY']
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            print(f"Payload décodé : {payload}")  # Log pour debug
            return User.query.get(payload['user_id'])
        except jwt.ExpiredSignatureError:
            print("Le jeton a expiré.")
            return None
        except jwt.InvalidTokenError:
            print("Le jeton est invalide.")
            return None


class TrackedResource(db.Model):
    __tablename__ = 'tracked_resources'
    id = db.Column(db.Integer, primary_key=True)
    component_id = db.Column(db.Integer, db.ForeignKey('components.id'), nullable=False)
    component_name = db.Column(db.String(255), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref='tracked_resources', lazy=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<TrackedResource {self.component_name} (User: {self.user_id})>"
