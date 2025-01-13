import pytest
from app import create_app

def test_secret_key_type():
    app = create_app()
    with app.app_context():
        secret_key = app.config['SECRET_KEY']

        # Vérifiez que la clé est en bytes ou convertible
        assert isinstance(secret_key, (str, bytes)), "SECRET_KEY doit être un str ou des bytes"
        if isinstance(secret_key, str):
            secret_key = secret_key.encode('utf-8')
        assert isinstance(secret_key, bytes), "SECRET_KEY doit être convertible en bytes"


def test_mail_default_sender():
    app = create_app()
    with app.app_context():
        mail_default_sender = app.config['MAIL_DEFAULT_SENDER']
        assert mail_default_sender is not None, "MAIL_DEFAULT_SENDER ne doit pas être None"
