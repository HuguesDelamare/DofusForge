import datetime
import requests
from flask import Blueprint, render_template, jsonify, request
from app import db
from app.models import Item, Component, Recipe, RecipeComponent, ComponentsPrice, User, TrackedResource
from flask_login import current_user, login_required
from urllib.parse import quote, unquote
import unicodedata

routes = Blueprint('routes', __name__)

@routes.route("/")
def homepage():
    return render_template("homepage.html")

@routes.route("/auth/profile")
@login_required
def profile():
    return render_template("auth/profile.html")

@routes.route("/get_component_prices/<int:item_id>", methods=["GET"])
@login_required
def get_component_prices(item_id):
    try:
        recipe_components = RecipeComponent.query.filter_by(recipe_id=item_id).all()
        components_data = []

        for rc in recipe_components:
            last_price = (ComponentsPrice.query
                          .filter_by(component_id=rc.component_id)
                          .order_by(ComponentsPrice.date_recorded.desc())
                          .first())
            is_tracked = TrackedResource.query.filter_by(user_id=current_user.id, component_id=rc.component_id).first() is not None

            components_data.append({
                "component_id": rc.component_id,
                "component_name": rc.component.name,
                "image_url": rc.component.image_url,
                "quantity": rc.quantity,
                "last_price": last_price.component_price if last_price else 0,
                "is_tracked": is_tracked  # Ajout de l'état suivi
            })

        return jsonify(components_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def normalize_slug(slug):
    """
    Normalise un slug : supprime les accents et met en minuscule,
    tout en conservant les espaces pour qu'ils soient encodés en %20.
    """
    slug = slug.replace("œ", "oe").replace("Œ", "Oe")
    slug_normalized = unicodedata.normalize('NFD', slug).encode('ascii', 'ignore').decode('utf-8')
    slug_normalized = slug_normalized.lower()  # Convertir en minuscule
    return slug_normalized

@routes.route("/get_resource_data/<int:component_id>", methods=["GET"])
@login_required
def get_resource_data(component_id):
    try:
        component = Component.query.get(component_id)
        if not component:
            return jsonify({"error": "Composant introuvable."}), 404

        # Récupérez les données de prix associées au composant
        prices = (ComponentsPrice.query
                  .filter_by(component_id=component_id)
                  .order_by(ComponentsPrice.date_recorded.asc())
                  .all())
        
        # Formatage des données pour les retourner en JSON
        price_data = [
            {"date": price.date_recorded.isoformat(), "price": price.component_price}
            for price in prices
        ]

        return jsonify({
            "component": {
                "id": component.id,
                "name": component.name,
                "type": component.type,
                "description": component.description,
                "image_url": component.image_url
            },
            "prices": price_data
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@routes.route("/ingredient_prices", methods=['POST'])
def save_ingredient_prices():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Aucune donnée reçue (JSON attendu)"}), 400

        # Extraction du nom propre
        item_name = data.get('item_name', "").split(" (")[0].strip()  # Supprime "(Niveau xx)"
        item_price = data.get('item_price')
        item_craft_price = data.get('item_craft_price', 0)
        components = data.get('components')

        recipe = Recipe(
            item_id=data.get('item_id'),
            item_name=item_name,  # Nom propre
            item_price=item_price,
            item_craft_price=item_craft_price,
            user_id=current_user.id
        )
        db.session.add(recipe)

        if components:
            for component in components:
                component_id = component.get('componentId')
                price = component.get('price')
                if component_id and price is not None:
                    comp_price_obj = ComponentsPrice(
                        component_id=component_id,
                        component_price=price
                    )
                    db.session.add(comp_price_obj)

        db.session.commit()
        return jsonify({"message": "Prix enregistré avec succès."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@routes.route("/api/last_component_price/<int:component_id>", methods=["GET"])
def last_component_price(component_id):
    try:
        component = Component.query.get(component_id)
        if not component:
            return jsonify({"error": "Composant introuvable."}), 404

        prices = (ComponentsPrice.query
                  .filter_by(component_id=component_id)
                  .order_by(ComponentsPrice.date_recorded.asc())  # Tri par date ascendante
                  .all())

        if not prices:
            return jsonify({"error": "Aucun prix trouvé pour ce composant."}), 404

        data = {
            "component_id": component_id,
            "component_name": component.name,  # Ajout du nom du composant
            "prices": [{"date": p.date_recorded.isoformat(), "price": p.component_price} for p in prices]
        }
        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": f"Erreur serveur : {str(e)}"}), 500

@routes.route("/api/last_recipes/<int:item_id>", methods=["GET"])
def get_last_recipes(item_id):
    try:
        # Vérifie que `item_id` est valide
        recipes = (Recipe.query
                   .filter_by(item_id=item_id)  # Utilisation correcte de `item_id`
                   .order_by(Recipe.date_recorded.desc())
                   .limit(10)
                   .all())

        if not recipes:
            return jsonify([]), 200  # Renvoie une liste vide si aucune recette n'est trouvée

        # Construire la liste des données des recettes
        data = []
        for r in recipes:
            recipe_components = RecipeComponent.query.filter_by(recipe_id=r.item_id).all()
            components_with_prices = []
            for rc in recipe_components:
                component = Component.query.get(rc.component_id)
                if component:
                    last_price_entry = (ComponentsPrice.query
                                        .filter_by(component_id=component.id)
                                        .order_by(ComponentsPrice.date_recorded.desc())
                                        .first())
                    last_price = last_price_entry.component_price if last_price_entry else 0

                    components_with_prices.append({
                        "component_id": component.id,
                        "component_name": component.name,
                        "quantity": rc.quantity,
                        "last_price": last_price
                    })

            data.append({
                "item_id": r.item_id,
                "item_name": r.item_name,
                "item_craft_price": r.item_craft_price,
                "item_price": r.item_price,
                "date_recorded": r.date_recorded.isoformat(),
                "added_by": r.user.username if r.user else "Inconnu",
                "components": components_with_prices
            })

        return jsonify(data), 200

    except Exception as e:
        print(f"Erreur lors de la récupération des anciens crafts : {e}")
        return jsonify({"error": str(e)}), 500

@routes.route("/api/user_last_recipes", methods=['GET'])
def get_user_last_recipes():
    try:
        if not current_user.is_authenticated:
            return jsonify({"error": "Utilisateur non connecté."}), 401

        recipes = Recipe.query.filter_by(user_id=current_user.id).order_by(Recipe.date_recorded.desc()).limit(10).all()

        data = [
            {
                "id": r.id,
                "item_id": r.item_id,
                "item_name": r.item_name,
                "item_craft_price": r.item_craft_price,
                "item_price": r.item_price,
                "image_url": r.item.image_url if r.item else None,  # Inclure l'image de l'objet
                "date_recorded": r.date_recorded.isoformat()
            }
            for r in recipes
        ]

        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@routes.route("/crafting_equipement")
@login_required
def crafting_equipement():
    return render_template("crafting_equipement.html")

def get_or_create_item(item_data):
    try:
        # Vérifier si l'item existe déjà
        existing_item = Item.query.get(item_data["id"])
        if existing_item:
            return existing_item

        # Créer un nouvel item s'il n'existe pas
        item = Item(
            id=item_data["id"],
            name=item_data.get("name", {}).get("fr", "Nom inconnu"),
            level=item_data.get("level"),
            type=item_data.get("type", {}).get("name", {}).get("fr", "Type inconnu"),
            description=item_data.get("description", {}).get("fr", ""),
            image_url=item_data.get("img", ""),
            item_set=item_data.get("itemSet", {}).get("name", {}).get("fr") if item_data.get("itemSet") else None
        )
        db.session.add(item)
        db.session.commit()
        return item
    except Exception as e:
        db.session.rollback()
        print(f"Erreur lors de la création de l'item : {e}")
        return Item.query.get(item_data["id"])  # Requête de secours

def get_or_create_component(ingredient_id, ingredient_data):
    print(f"Vérification du composant avec ID : {ingredient_id}")
    existing_component = Component.query.get(ingredient_id)
    if existing_component:
        print(f"Composant déjà existant : {existing_component}")
        return existing_component

    print(f"Création d'un nouveau composant : {ingredient_data}")
    component = Component(
        id=ingredient_id,
        name=ingredient_data["name"]["fr"],
        image_url=ingredient_data.get("img", ""),
        description=ingredient_data.get("description", {}).get("fr", ""),
        type=ingredient_data.get("type", {}).get("name", {}).get("fr", "Type inconnu")
    )
    db.session.add(component)
    db.session.commit()
    return component

@routes.route("/get_craft_data/<slug>", methods=["GET"])
@login_required
def get_craft_data(slug):
    try:
        # Décodage et normalisation du slug
        decoded_slug = unquote(slug).strip()
        normalized_slug = normalize_slug(decoded_slug)
        print(f"Slug décodé : {decoded_slug}, Slug normalisé : {normalized_slug}")

        # Vérifiez si l'item existe dans la base locale
        item = Item.query.filter(Item.name.ilike(f"%{decoded_slug}%")).first()
        if item:
            print(f"Item trouvé dans la base locale : {item}")
            return jsonify({
                "item": {
                    "id": item.id,
                    "name": item.name,
                    "level": item.level,
                    "type": item.type,
                    "description": item.description,
                    "image_url": item.image_url,
                    "item_set": item.item_set
                },
                "components": get_recipe_components(item.id)
            }), 200

        # Requête API avec le slug normalisé et encodé
        api_items_url = f"https://api.dofusdb.fr/items?slug.fr={quote(normalized_slug)}"
        items_response = requests.get(api_items_url)
        if items_response.status_code != 200:
            return jsonify({"error": "Objet introuvable dans l'API."}), 404

        items_data = items_response.json()
        if not items_data.get("data"):
            return jsonify({"error": "Aucun objet trouvé pour ce slug."}), 404

        # Traitement de l'item récupéré depuis l'API
        item_data = items_data["data"][0]
        item = get_or_create_item(item_data)

        # Récupérer les recettes associées
        api_recipes_url = f"https://api.dofusdb.fr/recipes/{item.id}?lang=fr"
        recipes_response = requests.get(api_recipes_url)
        if recipes_response.status_code != 200:
            return jsonify({"error": "Recette introuvable pour cet item."}), 404

        recipes_data = recipes_response.json()
        for ingredient_id, quantity in zip(recipes_data.get("ingredientIds", []), recipes_data.get("quantities", [])):
            ingredient_data = next((comp for comp in recipes_data.get("ingredients", []) if comp["id"] == ingredient_id), None)
            db_component = get_or_create_component(ingredient_id, ingredient_data)

            # Vérifiez si la relation existe déjà
            existing_recipe_component = RecipeComponent.query.filter_by(
                recipe_id=item.id,
                component_id=db_component.id
            ).first()

            if existing_recipe_component:
                print(f"Relation déjà existante : recipe_id={item.id}, component_id={db_component.id}")
                continue  # Passez au composant suivant

            # Ajouter la relation composant-recette uniquement si elle n'existe pas
            recipe_component = RecipeComponent(recipe_id=item.id, component_id=db_component.id, quantity=quantity)
            db.session.add(recipe_component)


        db.session.commit()

        return jsonify({
            "item": {
                "id": item.id,
                "name": item.name,
                "level": item.level,
                "type": item.type,
                "description": item.description,
                "image_url": item.image_url,
                "item_set": item.item_set
            },
            "components": get_recipe_components(item.id)
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Erreur : {e}")
        return jsonify({"error": str(e)}), 500

def get_recipe_components(recipe_id):
    components = RecipeComponent.query.filter_by(recipe_id=recipe_id).all()
    return [
        {
            "component_id": component.id,
            "component_name": component.name,
            "quantity": rc.quantity,
            "type": component.type,
            "image_url": component.image_url,
            "description": component.description
        }
        for rc in components if (component := Component.query.get(rc.component_id))
    ]

@routes.route("/api/autocomplete_items", methods=["GET"])
@login_required
def autocomplete_items():
    term = request.args.get("term", "").strip().lower()
    if not term:
        return jsonify([]), 200

    try:
        results = Item.query.filter(Item.name.ilike(f"%{term}%")).limit(10).all()
        if results:
            return jsonify([
                {"slug": item.name, "name": item.name, "level": item.level, "id": item.id}
                for item in results
            ]), 200

        api_url = f"https://api.dofusdb.fr/items?slug.fr={quote(term)}"
        response = requests.get(api_url)
        if response.status_code != 200:
            return jsonify([]), 200

        api_data = response.json().get("data", [])
        return jsonify([
            {"slug": item["name"]["fr"], "name": item["name"]["fr"], "level": item["level"], "id": item["id"]}
            for item in api_data
        ]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@routes.route('/track_component', methods=['POST'])
@login_required
def track_component():
    data = request.get_json()
    component_id = data.get('component_id')
    component = Component.query.get(component_id)
    
    if not component:
        return jsonify({'error': 'Component not found'}), 404

    tracked_resource = TrackedResource.query.filter_by(user_id=current_user.id, component_id=component_id).first()
    if tracked_resource:
        return jsonify({'message': 'Component already tracked'}), 200

    new_tracked_resource = TrackedResource(
        component_id=component_id,
        component_name=component.name,
        user_id=current_user.id
    )
    db.session.add(new_tracked_resource)
    db.session.commit()

    return jsonify({'message': 'Component tracked successfully'}), 201

@routes.route("/my_trackings", methods=["GET"])
@login_required
def my_trackings():
    tracked_resources = TrackedResource.query.filter_by(user_id=current_user.id).all()
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify([
            {"component_id": t.component_id, "component_name": t.component_name}
            for t in tracked_resources
        ])
    return render_template("my_trackings.html", tracked_resources=tracked_resources)

@routes.route('/is_tracked/<int:component_id>', methods=['GET'])
@login_required
def is_tracked(component_id):
    is_tracked = TrackedResource.query.filter_by(user_id=current_user.id, component_id=component_id).first() is not None
    return jsonify({"isTracked": is_tracked}), 200

@routes.route("/untrack_component", methods=["POST"])
@login_required
def untrack_component():
    try:
        data = request.get_json()
        component_id = data.get("component_id")

        if not component_id:
            return jsonify({"success": False, "message": "L'ID du composant est requis."}), 400

        tracked = TrackedResource.query.filter_by(user_id=current_user.id, component_id=component_id).first()
        if not tracked:
            return jsonify({"success": False, "message": "Composant non suivi."}), 404

        db.session.delete(tracked)
        db.session.commit()
        return jsonify({"success": True, "message": "Composant supprimé du suivi"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Erreur : {str(e)}"}), 500