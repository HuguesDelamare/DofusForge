from flask_mail import Message
from flask import current_app, render_template

def send_email(mail, subject, recipients, template, **kwargs):
    """
    Envoie un email avec Flask-Mail en rendant un modèle HTML.
    
    :param mail: Instance Flask-Mail
    :param subject: Sujet de l'email
    :param recipients: Liste des destinataires
    :param template: Nom du modèle HTML pour le corps de l'email
    :param kwargs: Variables à injecter dans le modèle HTML
    """
    try:
        html_body = render_template(template, **kwargs)
        msg = Message(
            subject=subject,
            recipients=recipients,
            html=html_body,
            sender=current_app.config['MAIL_DEFAULT_SENDER']
        )
        mail.send(msg)
        print(f"Email envoyé à {recipients}")
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email : {e}")
