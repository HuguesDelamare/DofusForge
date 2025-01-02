import datetime
from flask import Blueprint, render_template, jsonify, request
from app import db
from app.models import ComponentsPrice, Recipe, TrackedResource, db
from flask_login import current_user, login_required

routes = Blueprint('routes', __name__)

@routes.route("/")
def index():
    return render_template("index.html")

@routes.route("/ingredient_prices", methods=['POST'])
def save_ingredient_prices():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Aucune donnée reçue (JSON attendu)"}), 400

        item_id = data.get('item_id')
        item_name = data.get('item_name', "").strip()
        item_price = data.get('item_price')
        item_craft_price = data.get('item_craft_price', 0)
        components = data.get('components')

        # Crée la recette
        recipe = Recipe(
            item_id=item_id,
            item_name=item_name,
            item_price=item_price,
            item_craft_price=item_craft_price,
            user_id=current_user.id
        )
        db.session.add(recipe)

        # Insère également dans ComponentsPrice
        component_prices = []
        if components:
            for component in components:
                component_id = component.get('componentId')
                price = component.get('price')
                # Exemple : validations minimales
                if not component_id or not price:
                    return jsonify({"error": "Données composant incomplètes"}), 400

                comp_price_obj = ComponentsPrice(
                    component_id=component_id,
                    component_price=price
                )
                component_prices.append(comp_price_obj)

        db.session.add_all(component_prices)
        db.session.commit()

        return jsonify({"message": "Ok"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@routes.route("/api/last_component_price/<int:component_id>", methods=["GET"])
def last_component_price(component_id):
    try:
        last_record = (ComponentsPrice.query
                       .filter_by(component_id=component_id)
                       .order_by(ComponentsPrice.date_recorded.desc())
                       .first())
        if not last_record:
            return jsonify({"last_price": 0}), 200

        data = {
            "component_id": component_id,
            "last_price": last_record.component_price
        }
        return jsonify(data), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@routes.route("/api/last_recipes/<int:item_id>", methods=['GET'])
def get_last_recipes(item_id):
    try:
        recipes = (Recipe.query
                   .filter_by(item_id=item_id)
                   .order_by(Recipe.date_recorded.desc())
                   .limit(10)
                   .all())

        data = []
        for r in recipes:
            data.append({
                "id": r.id,
                "item_id": r.item_id,
                "item_name": r.item_name,
                "item_craft_price": r.item_craft_price,
                "item_price": r.item_price,
                "date_recorded": r.date_recorded.isoformat(),
                "added_by": r.user.username if r.user else "Inconnu"
            })

        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@routes.route('/track_resource', methods=['POST'])
@login_required
def track_resource():
    try:
        data = request.get_json()
        resource_id = data.get('resource_id')
        resource_name = data.get('resource_name')
        action = data.get('action')  # "add" ou "remove"

        if not resource_id or not resource_name or not action:
            return jsonify({'error': 'Données invalides'}), 400

        if action == "add":
            existing_tracking = TrackedResource.query.filter_by(
                user_id=current_user.id,
                resource_id=resource_id
            ).first()

            if existing_tracking:
                return jsonify({'message': f"La ressource '{resource_name}' est déjà suivie."}), 200

            new_tracking = TrackedResource(
                user_id=current_user.id,
                resource_id=resource_id,
                resource_name=resource_name
            )
            db.session.add(new_tracking)
        elif action == "remove":
            existing_tracking = TrackedResource.query.filter_by(
                user_id=current_user.id,
                resource_id=resource_id
            ).first()

            if existing_tracking:
                db.session.delete(existing_tracking)

        db.session.commit()
        return jsonify({'message': f"Action '{action}' effectuée sur la ressource '{resource_name}'."}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@routes.route('/trackings', methods=['GET'])
@login_required
def trackings():
    trackings = db.session.query(
        TrackedResource.resource_name,
        db.func.max(ComponentsPrice.component_price).label("last_price"),
        db.func.max(ComponentsPrice.date_recorded).label("date_recorded"),
        TrackedResource.resource_id
    ).join(
        ComponentsPrice, TrackedResource.resource_id == ComponentsPrice.component_id
    ).filter(
        TrackedResource.user_id == current_user.id
    ).group_by(
        TrackedResource.resource_name, TrackedResource.resource_id
    ).order_by(
        db.func.max(ComponentsPrice.date_recorded).desc()
    ).all()

    return render_template('trackings.html', trackings=trackings)

@routes.route('/api/resource_history/<int:resource_id>', methods=['GET'])
@login_required
def resource_history(resource_id):
    try:
        history = (ComponentsPrice.query
                   .filter_by(component_id=resource_id)
                   .order_by(ComponentsPrice.date_recorded.asc())
                   .all())

        data = [{
            "date_recorded": record.date_recorded.strftime('%Y-%m-%d'),
            "price": record.component_price
        } for record in history]

        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@routes.route('/api/is_tracked/<int:resource_id>', methods=['GET'])
@login_required
def is_tracked(resource_id):
    try:
        tracking = TrackedResource.query.filter_by(
            user_id=current_user.id,
            resource_id=resource_id
        ).first()
        return jsonify({"is_tracked": tracking is not None}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
