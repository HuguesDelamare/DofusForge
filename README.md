# DofusCraft

DofusCraft est une application web pour gérer et optimiser les crafts dans le jeu Dofus.

## Prérequis

- Python 3.x
- Pip
- Virtualenv

## Installation

1. Clonez le dépôt :
    ```sh
    git clone https://github.com/votre-utilisateur/DofusForge.git
    cd DofusCraft
    ```

2. Créez et activez un environnement virtuel :
    ```sh
    python -m venv venv
    source venv/bin/activate  # Sur Windows: venv\Scripts\activate
    ```

3. Installez les dépendances :
    ```sh
    pip install -r requirements.txt
    ```

## Configuration

Créez un fichier `.env` à la racine du projet et ajoutez les variables d'environnement nécessaires :
```
DATABASE_URL=postgresql://user:password@localhost/dbname
SECRET_KEY=votre-cle-secrete
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USE_SSL=False
MAIL_USERNAME=votre-email@gmail.com
MAIL_PASSWORD=votre-mot-de-passe
MAIL_DEFAULT_SENDER=votre-email@gmail.com
```

## Utilisation

1. Initialisez la base de données :
    ```sh
    flask db upgrade
    ```

2. Lancez l'application :
    ```sh
    flask run
    ```

3. Accédez à l'application dans votre navigateur à l'adresse `http://127.0.0.1:5000`.

## Fonctionnalités

- **Gestion des crafts** : Calculez les coûts de craft et gérez vos recettes efficacement.
- **Suivi des composants** : Suivez vos composants en temps réel et restez informé.
- **Contrats recherchés** : Découvrez les ressources les plus demandées sur le marché.
- **Élevage** : Suivez votre élevage de dragodindes ou montiliers.
- **Forgemagie** : Suivez vos composants en temps réel et restez informé.

## Menus

- **Accueil** : Page d'accueil avec un aperçu des fonctionnalités.
- **Crafter un équipement** : Page pour gérer les crafts d'équipements.
- **Mes suivis** : Page pour suivre les composants.
- **Contrats recherchés** : Page pour voir les ressources les plus demandées.
- **Élevage** : Page pour gérer l'élevage de dragodindes ou montiliers.
- **Forgemagie** : Page pour gérer la forgemagie.

## Contribuer

Les contributions sont les bienvenues ! Veuillez soumettre une pull request pour toute amélioration ou correction de bug.

## Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.