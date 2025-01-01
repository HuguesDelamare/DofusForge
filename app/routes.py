from flask import Blueprint, render_template, jsonify, request
from app import db
from app.models import ComponentsPrice, Recipe, TrackedResource
from flask_login import current_user

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
    """
    Récupère le dernier prix enregistré pour un composant donné (component_id).
    Tri par date_recorded desc et prend le premier.
    """
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
    """
    Récupère les 10 dernières recettes pour un 'item_id' donné,
    triées par date_recorded décroissante.
    Inclut le nom d'utilisateur ayant ajouté la recette.
    """
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
                "added_by": r.user.username if r.user else "Inconnu"  # Relation User <-> Recipe
            })

        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


from app.models import TrackedResource

@routes.route('/track_resource', methods=['POST'])
def track_resource():
    try:
        if not current_user.is_authenticated:
            return jsonify({"error": "Utilisateur non authentifié"}), 401

        data = request.get_json()
        resource_id = data.get('resource_id')
        resource_name = data.get('resource_name')
        current_price = data.get('current_price', 0)

        if not resource_id or not resource_name:
            return jsonify({"error": "Données incomplètes"}), 400

        tracked = TrackedResource.query.filter_by(
            user_id=current_user.id, resource_id=resource_id
        ).first()

        if tracked:
            return jsonify({"message": "Cette ressource est déjà suivie"}), 200

        new_tracked = TrackedResource(
            user_id=current_user.id,
            resource_id=resource_id,
            resource_name=resource_name,
            current_price=current_price
        )
        db.session.add(new_tracked)
        db.session.commit()
        return jsonify({"message": "Ressource suivie avec succès"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@routes.route('/untrack_resource', methods=['POST'])
def untrack_resource():
    try:
        if not current_user.is_authenticated:
            return jsonify({"error": "Utilisateur non authentifié"}), 401

        data = request.get_json()
        resource_id = data.get('resource_id')

        if not resource_id:
            return jsonify({"error": "ID de la ressource manquant"}), 400

        tracked = TrackedResource.query.filter_by(
            user_id=current_user.id, resource_id=resource_id
        ).first()

        if not tracked:
            return jsonify({"error": "Ressource non trouvée"}), 404

        db.session.delete(tracked)
        db.session.commit()
        return jsonify({"message": "Ressource retirée du suivi"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
