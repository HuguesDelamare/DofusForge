from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app
from flask_login import login_user, logout_user, login_required, current_user
from app.utils import send_email
from flask_mail import Message, Mail
from flask import current_app, jsonify
from app.models import User
from app import db, mail
import secrets

auth = Blueprint('auth', __name__)

@auth.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']

        # Vérification de l'existence de l'utilisateur
        if User.query.filter_by(email=email).first():
            flash('Email déjà utilisé.', 'danger')
            return redirect(url_for('auth.register'))

        if User.query.filter_by(username=username).first():
            flash('Nom d\'utilisateur déjà pris.', 'danger')
            return redirect(url_for('auth.register'))

        # Création d'un nouvel utilisateur
        user = User(username=username, email=email)
        user.set_password(password)

        db.session.add(user)
        db.session.commit()  # L'utilisateur est maintenant enregistré avec un ID valide

        # Générer un token de confirmation
        token = user.generate_confirmation_token()
        confirmation_url = url_for('auth.confirm_email', token=token, _external=True)

        # Envoyer l'email de confirmation
        send_email(
            subject="Confirmez votre compte DofusForge",
            recipients=[user.email],
            template="emails/confirm_email.html",
            confirmation_url=confirmation_url
        )

        flash('Un email de confirmation vous a été envoyé.', 'info')
        return redirect(url_for('auth.login'))
    
    return render_template('auth/register.html')


@auth.route('/confirm/<token>')
def confirm_email(token):
    print(f"Token reçu pour confirmation : {token}")  # Log
    user = User.verify_confirmation_token(token)
    if not user:
        print("Aucun utilisateur trouvé pour ce token.")  # Log
        flash('Le lien de confirmation est invalide ou a expiré.', 'danger')
        return redirect(url_for('auth.register'))

    print(f"Utilisateur trouvé : {user.username}, is_confirmed : {user.is_confirmed}")  # Log
    if user.is_confirmed:
        flash('Votre compte a déjà été confirmé.', 'info')
    else:
        user.is_confirmed = True
        db.session.commit() 
        print(f"Utilisateur {user.username} confirmé avec succès.")  # Log
        flash('Votre compte a été confirmé avec succès !', 'success')

    return redirect(url_for('auth.login'))

def send_email(subject, recipients, template, **kwargs):
    """
    Envoie un email avec Flask-Mail.
    :param subject: Sujet de l'email
    :param recipients: Liste des destinataires
    :param template: Chemin vers le template HTML
    :param kwargs: Variables pour le template
    """
    try:
        # Rendu du contenu HTML à partir du template
        html_body = render_template(template, **kwargs)

        # Création du message
        msg = Message(
            subject=subject,
            recipients=recipients,
            html=html_body,
            sender=current_app.config['MAIL_DEFAULT_SENDER']
        )

        # Envoi de l'email
        mail.send(msg)
        print(f"Email envoyé à : {recipients}")
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email : {e}")
        raise

@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            if not user.is_confirmed:
                flash('Veuillez confirmer votre email avant de vous connecter.', 'warning')
                return redirect(url_for('auth.login'))

            login_user(user)
            flash('Connexion réussie.', 'success')
            return redirect(url_for('routes.homepage'))

        flash('Email ou mot de passe incorrect.', 'danger')

    return render_template('auth/login.html')

@auth.route('/resend_confirmation', methods=['GET', 'POST'])
def resend_confirmation():
    if request.method == 'POST':
        email = request.form['email']
        user = User.query.filter_by(email=email).first()

        if not user:
            flash('Adresse email non trouvée.', 'danger')
            return redirect(url_for('auth.resend_confirmation'))

        if user.is_confirmed:
            flash('Ce compte a déjà été confirmé.', 'info')
            return redirect(url_for('auth.login'))

        token = user.generate_confirmation_token()
        confirmation_url = url_for('auth.confirm_email', token=token, _external=True)

        send_email(
            subject="Renvoyer la confirmation DofusForge",
            recipients=[user.email],
            template="emails/confirm_email.html",
            confirmation_url=confirmation_url
        )

        flash('Un nouveau lien de confirmation a été envoyé.', 'info')
        return redirect(url_for('auth.login'))

    return render_template('auth/resend_confirmation.html')


test_email = Blueprint('test_email', __name__)

@test_email.route('/send_test_email')
def send_test_email():
    try:
        send_email(
            subject="Test Email",
            recipients=["bluekikiller74@gmail.com"], 
            template="emails/confirm_email.html",
            confirmation_url="https://example.com/test-confirmation"
        )
        return jsonify({"message": "Email envoyé avec succès !"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

