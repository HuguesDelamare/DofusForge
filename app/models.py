from datetime import datetime, timezone
from app import db

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
    item_price = db.Column(db.Integer, nullable=False)  # Prix HDV
    item_craft_price = db.Column(db.Integer, nullable=False, default=0)  # Prix du craft

    date_recorded = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc).replace(second=0, microsecond=0)
    )

    def __repr__(self):
        return (
            f"<Recipe {self.id}, item_id={self.item_id}, item_name={self.item_name}, "
            f"item_price={self.item_price}, craft_price={self.item_craft_price}, "
            f"date={self.date_recorded}>"
        )