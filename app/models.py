from datetime import datetime, timezone
from app import db
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

class ComponentsPrice(db.Model):
    __tablename__ = 'component_price'
    id = db.Column(db.Integer, primary_key=True)
    component_id = db.Column(db.Integer, nullable=False)
    component_price = db.Column(db.Integer)
    date_recorded = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc).replace(second=0, microsecond=0)
    )

    def __repr__(self):
        return (
            f"<ComponentsPrice "
            f"id={self.id}, "
            f"component_id={self.component_id}, "
            f"component_price={self.component_price}, "
            f"date={self.date_recorded}>"
        )

class Recipe(db.Model):
    __tablename__ = 'recipes'
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, nullable=False)
    item_name = db.Column(db.String(255), nullable=False)
    item_price = db.Column(db.Integer, nullable=False)
    item_craft_price = db.Column(db.Integer, nullable=False, default=0)
    date_recorded = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relation avec User
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    user = db.relationship('User', backref='recipes', lazy=True)

    def __repr__(self):
        return (
            f"<Recipe {self.id}, item_id={self.item_id}, item_name={self.item_name}, "
            f"item_price={self.item_price}, craft_price={self.item_craft_price}, "
            f"date={self.date_recorded}>"
        )

    
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