from datetime import datetime, timedelta
import click
from flask import current_app
from flask.cli import with_appcontext
import json
from app.models import Bounty, db

@click.command('create-servers')
@with_appcontext
def create_servers():
    from app.models import Server  # Import différé pour éviter les imports circulaires
    from app import db  # Import différé

    servers = [
        {"name": "Dakal 1", "server_type": "Serveur pionnier", "language": "International"},
        {"name": "Dakal 2", "server_type": "Serveur pionnier", "language": "International"},
        {"name": "Dakal 3", "server_type": "Serveur pionnier", "language": "International"},
        {"name": "Dakal 4", "server_type": "Serveur pionnier", "language": "International"},
        {"name": "Dakal 5", "server_type": "Serveur pionnier", "language": "International"},
        {"name": "Dakal 6", "server_type": "Serveur pionnier", "language": "International"},
        {"name": "Dakal 7", "server_type": "Serveur pionnier", "language": "International"},
        {"name": "Dakal 8", "server_type": "Serveur pionnier", "language": "International"},
        {"name": "Dakal 9", "server_type": "Serveur pionnier", "language": "International"},
        {"name": "Dakal 10", "server_type": "Serveur pionnier", "language": "International"},
        {"name": "Dakal 11", "server_type": "Serveur pionnier", "language": "International"},
        {"name": "Dakal 12", "server_type": "Serveur pionnier", "language": "International"}
    ]

    for server_data in servers:
        server = Server.query.filter_by(name=server_data["name"]).first()
        if not server:
            server = Server(
                name=server_data["name"],
                server_type=server_data["server_type"],
                language=server_data["language"],
            )
            db.session.add(server)

    db.session.commit()
    click.echo("Les serveurs ont été ajoutés avec succès.")

@click.command('load-bounties')
@with_appcontext
def load_bounties():
    """Charge les données des recherchés depuis un fichier JSON dans la base de données."""
    try:
        with open('app/bounties_data/bounties.json', 'r', encoding='utf-8') as f:
            bounties_data = json.load(f)
    except FileNotFoundError:
        click.echo("Fichier bounties_data.json introuvable.")
        return
    except json.JSONDecodeError as e:
        click.echo(f"Erreur de décodage JSON : {e}")
        return

    for bounty_data in bounties_data:
        existing_bounty = Bounty.query.filter_by(name=bounty_data["name"]).first()
        if not existing_bounty:
            last_killed_at_default = datetime.utcnow() - timedelta(hours=3)
            
            bounty = Bounty(
                name=bounty_data["name"],
                respawn_time=bounty_data["respawn_time"],
                image_url=bounty_data["image_url"],
                infos_image=bounty_data["infos_image"],  # Ajouter l'image d'information
                links=bounty_data["links"],
                reward_amount=bounty_data["reward"]["amount"],
                reward_type=bounty_data["reward"]["type"],
                difficulty=bounty_data["difficulty"],
                location_image=bounty_data["location"]["image"],
                location_map_name=bounty_data["location"]["map_name"],
                server_id=bounty_data.get("server_id"),
                last_killed_at=last_killed_at_default
            )
            db.session.add(bounty)

    try:
        db.session.commit()
        click.echo("Données des recherchés chargées avec succès.")
    except Exception as e:
        db.session.rollback()
        click.echo(f"Erreur lors de l'insertion des données : {e}")