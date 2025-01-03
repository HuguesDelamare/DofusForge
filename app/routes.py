import datetime
from flask import Blueprint, render_template, jsonify, request
from app import db
from app.models import ComponentsPrice, TrackedResource, Recipe, db
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

@routes.route("/my_trackings", methods=["GET"])
@login_required
def my_trackings():
    # Récupérer les suivis de l'utilisateur connecté
    tracked_resources = TrackedResource.query.filter_by(user_id=current_user.id).all()

    # Si c'est une requête AJAX (JSON demandé)
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify([
            {"component_id": t.component_id, "component_name": t.component_name}
            for t in tracked_resources
        ])

    # Sinon, rendre la page HTML
    return render_template(
        "my_trackings.html",
        tracked_resources=tracked_resources
    )

@routes.route("/track_component", methods=["POST"])
@login_required
def track_component():
    data = request.get_json()
    component_id = data.get("component_id")
    component_name = data.get("component_name")

    if not component_id or not component_name:
        return jsonify({"error": "Données invalides"}), 400

    # Vérifiez si l'utilisateur a déjà atteint la limite
    count = TrackedResource.query.filter_by(user_id=current_user.id).count()
    if count >= 15:
        return jsonify({"error": "Vous ne pouvez pas suivre plus de 15 composants."}), 400

    # Vérifiez si le composant est déjà suivi
    existing = TrackedResource.query.filter_by(
        component_id=component_id,
        user_id=current_user.id
    ).first()

    if existing:
        return jsonify({"message": "Composant déjà suivi"}), 200

    # Ajoutez le composant à la base de données
    new_tracking = TrackedResource(
        component_id=component_id,
        component_name=component_name,
        user_id=current_user.id
    )
    db.session.add(new_tracking)
    db.session.commit()

    return jsonify({"message": "Composant ajouté au suivi"}), 201

@routes.route("/untrack_component", methods=["POST"])
@login_required
def untrack_component():
    try:
        data = request.get_json()
        component_id = data.get("component_id")

        # Vérifiez que le composant existe pour cet utilisateur
        tracked = TrackedResource.query.filter_by(
            component_id=component_id,
            user_id=current_user.id
        ).first()

        if not tracked:
            # Retourne un message au lieu d'une erreur HTTP
            return jsonify({"message": "Ce composant n'est pas suivi."}), 200

        # Supprimez le composant
        db.session.delete(tracked)
        db.session.commit()

        return jsonify({"message": "Composant supprimé du suivi"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@routes.route("/get_craft_data/<int:item_id>", methods=["GET"])
@login_required
def get_craft_data(item_id):
    try:
        # Récupérer les composants de la recette pour l'item donné
        recipe = Recipe.query.filter_by(item_id=item_id).first()
        if not recipe:
            return jsonify({"error": "Recette introuvable"}), 404

        # Adaptez en fonction de la structure de vos données pour les composants
        components = [
            {
                "component_id": c.component_id,
                "component_name": c.component_name,
                "quantity": c.quantity,
                "is_tracked": TrackedResource.query.filter_by(
                    component_id=c.component_id,
                    user_id=current_user.id
                ).first() is not None
            }
            for c in recipe.components  # Exemple : si les composants sont liés à la recette
        ]

        return jsonify(components), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@routes.route("/get_resource_data/<int:component_id>", methods=["GET"])
@login_required
def get_resource_data(component_id):
    try:
        # Récupérer toutes les entrées de prix pour le composant
        prices = ComponentsPrice.query.filter_by(component_id=component_id).order_by(ComponentsPrice.date_recorded.asc()).all()

        if not prices:
            return jsonify({"error": "Aucune donnée trouvée pour ce composant."}), 404

        # Récupérer le nom de la ressource depuis TrackedResource
        tracked = TrackedResource.query.filter_by(component_id=component_id, user_id=current_user.id).first()
        component_name = tracked.component_name if tracked else "Inconnu"

        data = {
            "component_id": component_id,
            "component_name": component_name,
            "prices": [{"date": p.date_recorded.isoformat(), "price": p.component_price} for p in prices]
        }

        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

