from flask import Blueprint, jsonify, render_template, request
from flask_login import login_required, current_user
from app.models import Server, Bounty, UserBountyStatus, ServerBounty, db
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
    tag = request.args.get('tag')
    query = ServerBounty.query.filter_by(server_id=server_id)
    if tag:
        query = query.join(Bounty).filter(Bounty.tag == tag)
    server_bounties = query.all()
    
    user_bounty_statuses = UserBountyStatus.query.filter_by(user_id=current_user.id).all()
    user_bounty_status_dict = {status.bounty_id: status.is_hunted for status in user_bounty_statuses}
    
    return jsonify([
        {
            'id': server_bounty.bounty.id,
            'name': server_bounty.bounty.name,
            'reward_amount': server_bounty.bounty.reward_amount,
            'reward_type': server_bounty.bounty.reward_type,
            'respawn_time': server_bounty.bounty.respawn_time,
            'image_url': server_bounty.bounty.image_url,
            'infos_image': server_bounty.bounty.infos_image,
            'links': server_bounty.bounty.links,
            'last_killed_at': server_bounty.last_killed_at,
            'location_image': server_bounty.bounty.location_image,
            'location_map_name': server_bounty.bounty.location_map_name,
            'starting_quest': server_bounty.bounty.starting_quest,
            'return_quest': server_bounty.bounty.return_quest,
            'tag': server_bounty.bounty.tag,
            'is_hunted': user_bounty_status_dict.get(server_bounty.bounty.id, False)
        } for server_bounty in server_bounties if server_bounty.bounty is not None
    ])

@bounties.route('/report/<int:bounty_id>', methods=['POST'])
@login_required
def report_bounty(bounty_id):
    server_id = request.json.get('server_id')
    server_bounty = ServerBounty.query.filter_by(bounty_id=bounty_id, server_id=server_id).first()
    if not server_bounty:
        return jsonify({'error': 'Bounty not found on this server'}), 404

    reported_at_str = request.json.get('reported_at')
    reported_at = datetime.fromisoformat(reported_at_str.replace("Z", "+00:00"))
    server_bounty.last_killed_at = reported_at
    db.session.commit()

    return jsonify({'success': 'Bounty reported successfully'})

@bounties.route('/track/<int:bounty_id>', methods=['POST'])
@login_required
def track_bounty(bounty_id):
    server_id = request.json.get('server_id')
    server_bounty = ServerBounty.query.filter_by(bounty_id=bounty_id, server_id=server_id).first()
    if not server_bounty:
        return jsonify({'error': 'Bounty not found on this server'}), 404

    is_hunted = request.json.get('is_hunted', False)
    user_bounty_status = UserBountyStatus.query.filter_by(user_id=current_user.id, bounty_id=bounty_id, server_id=server_id).first()
    if not user_bounty_status:
        user_bounty_status = UserBountyStatus(user_id=current_user.id, bounty_id=bounty_id, server_id=server_id, is_hunted=is_hunted)
        db.session.add(user_bounty_status)
    else:
        user_bounty_status.is_hunted = is_hunted

    db.session.commit()

    return jsonify({'success': 'Bounty tracking status updated successfully'})
