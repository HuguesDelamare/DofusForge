from datetime import datetime, timedelta, timezone
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from flask import current_app
from sqlalchemy.exc import IntegrityError
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
    item_price = db.Column(db.Integer, nullable=False)
    item_craft_price = db.Column(db.Integer, nullable=False, default=0)
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
            'user_id': self.id,
            'exp': datetime.utcnow() + timedelta(seconds=expires_in)
        }
        return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')

    @staticmethod
    def verify_confirmation_token(token):
        try:
            secret_key = current_app.config['SECRET_KEY']
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            return User.query.get(payload['user_id'])
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
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

class Server(db.Model):
    """
    Table représentant les serveurs (DAKAL, etc.).
    """
    __tablename__ = 'servers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    server_type = db.Column(db.String(100), nullable=False)
    language = db.Column(db.String(50), nullable=False)

    @staticmethod
    def validate_server_data(server_data):
        if not server_data.get('name'):
            raise ValueError("Le nom du serveur est obligatoire.")
        if not server_data.get('server_type'):
            raise ValueError("Le type du serveur est obligatoire.")
        if not server_data.get('language'):
            raise ValueError("La langue du serveur est obligatoire.")

    def __repr__(self):
        return f"<Server {self.name} ({self.server_type}, {self.language})>"

class Bounty(db.Model):
    __tablename__ = 'bounties'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    respawn_time = db.Column(db.Integer, nullable=False)
    image_url = db.Column(db.String(512), nullable=True)
    infos_image = db.Column(db.String(512), nullable=True)
    links = db.Column(db.String(512), nullable=True)
    reward_amount = db.Column(db.Integer, nullable=True)
    reward_type = db.Column(db.String(50), nullable=True)
    location_image = db.Column(db.String(512), nullable=True)
    location_map_name = db.Column(db.String(255), nullable=True)
    last_killed_at = db.Column(db.DateTime, default=datetime.utcnow)
    starting_quest = db.Column(db.String(255), nullable=True)
    return_quest = db.Column(db.String(255), nullable=True)
    tag = db.Column(db.String(255), nullable=True)

    def __repr__(self):
        return (
            f"<Bounty {self.name}, respawn_time={self.respawn_time}, reward={self.reward_amount} {self.reward_type}, "
            f"location={self.location_map_name}, starting_quest={self.starting_quest}, return_quest={self.return_quest}, tag={self.tag}>"
        )

class ServerBounty(db.Model):
    __tablename__ = 'server_bounties'
    id = db.Column(db.Integer, primary_key=True)
    server_id = db.Column(db.Integer, db.ForeignKey('servers.id'), nullable=False)
    bounty_id = db.Column(db.Integer, db.ForeignKey('bounties.id'), nullable=False)
    last_killed_at = db.Column(db.DateTime, default=datetime.utcnow)

    server = db.relationship('Server', backref='server_bounties', lazy=True)
    bounty = db.relationship('Bounty', backref='server_bounties', lazy=True)

    def __repr__(self):
        return f"<ServerBounty server_id={self.server_id}, bounty_id={self.bounty_id}, last_killed_at={self.last_killed_at}>"

class UserBountyStatus(db.Model):
    """
    Table reliant les utilisateurs aux recherchés pour gérer leur état de progression.
    """
    __tablename__ = 'user_bounty_status'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    bounty_id = db.Column(db.Integer, db.ForeignKey('bounties.id'), nullable=False)
    server_id = db.Column(db.Integer, db.ForeignKey('servers.id'), nullable=False)
    status = db.Column(db.Boolean, default=False)
    is_hunted = db.Column(db.Boolean, default=False)
    user = db.relationship('User', backref='bounty_statuses', lazy=True)
    bounty = db.relationship('Bounty', backref='user_statuses', lazy=True)
    server = db.relationship('Server', backref='user_statuses', lazy=True)

    def __repr__(self):
        return f"<UserBountyStatus user={self.user_id} bounty={self.bounty.name} server={self.server.name} status={self.status} is_hunted={self.is_hunted}>"
