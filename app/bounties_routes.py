from flask import Blueprint, jsonify, render_template, request
from flask_login import login_required, current_user
from app.models import Server, Bounty, UserBountyStatus, db
from datetime import datetime

bounties = Blueprint('bounties', __name__)

@bounties.route("/")
@login_required
def show_bounties():
    return render_template("bounties.html")

@bounties.route('/servers', methods=['GET'])
def get_servers():
    servers = Server.query.all()
    return jsonify([
        {
            'id': server.id,
            'name': server.name,
            'type': server.server_type,
            'language': server.language
        } for server in servers
    ])

@bounties.route('/<int:server_id>', methods=['GET'])
def get_bounties(server_id):
    bounties = Bounty.query.filter_by(server_id=server_id).all()
    user_bounty_statuses = UserBountyStatus.query.filter_by(user_id=current_user.id).all()
    user_bounty_status_dict = {status.bounty_id: status.is_hunted for status in user_bounty_statuses}
    
    return jsonify([
        {
            'id': bounty.id,
            'name': bounty.name,
            'reward_amount': bounty.reward_amount,
            'reward_type': bounty.reward_type,
            'respawn_time': bounty.respawn_time,
            'image_url': bounty.image_url,
            'infos_image': bounty.infos_image,
            'links': bounty.links,  # Assurez-vous que ce champ est inclus
            'last_killed_at': bounty.last_killed_at,
            'difficulty': bounty.difficulty,
            'location_image': bounty.location_image,
            'location_map_name': bounty.location_map_name,
            'is_hunted': user_bounty_status_dict.get(bounty.id, False)
        } for bounty in bounties
    ])

@bounties.route('/report/<int:bounty_id>', methods=['POST'])
@login_required
def report_bounty(bounty_id):
    bounty = Bounty.query.get(bounty_id)
    if not bounty:
        return jsonify({'error': 'Bounty not found'}), 404

    reported_at_str = request.json.get('reported_at')
    reported_at = datetime.fromisoformat(reported_at_str.replace("Z", "+00:00"))
    bounty.last_killed_at = reported_at
    db.session.commit()

    return jsonify({'success': 'Bounty reported successfully'})

@bounties.route('/track/<int:bounty_id>', methods=['POST'])
@login_required
def track_bounty(bounty_id):
    bounty = Bounty.query.get(bounty_id)
    if not bounty:
        return jsonify({'error': 'Bounty not found'}), 404

    is_hunted = request.json.get('is_hunted', False)
    user_bounty_status = UserBountyStatus.query.filter_by(user_id=current_user.id, bounty_id=bounty_id).first()
    if not user_bounty_status:
        user_bounty_status = UserBountyStatus(user_id=current_user.id, bounty_id=bounty_id, server_id=bounty.server_id, is_hunted=is_hunted)
        db.session.add(user_bounty_status)
    else:
        user_bounty_status.is_hunted = is_hunted

    db.session.commit()

    return jsonify({'success': 'Bounty tracking status updated successfully'})
