from flask import Flask, render_template, flash, redirect, url_for
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext.pymongo import PyMongo
from flask.ext.wtf import Form
from flask.ext.wtf.html5 import URLField
from flask.ext.markdown import Markdown
from wtforms import TextField, SelectMultipleField
import os
import json
import requests
from urlparse import urljoin
from risk.game import Game as RiskGame
from app.forms import UserForm, StartGameForm

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL') or ('sqlite:///' + os.path.join(app.root_path, '../app.db'))
app.secret_key = 'f520d319-8b73-45c1-9982-07e57c0ddaa6'
app.config['MONGO_HOST'] = os.environ.get('MONGO_HOST') or 'localhost'
db = SQLAlchemy(app)
mongo = PyMongo(app)
Markdown(app)

from app.models import User, Game
from player_helper import Player
from players_helper import Players
from start_game import start_risk_game

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/signup", methods=("GET", "POST"))
def signup():
    form = UserForm()
    if form.validate_on_submit():
        username = form.username.data
        base_url = form.base_url.data
        try:
            r = requests.get(urljoin(base_url,'status'))
        except Exception as e:
            print type(e), ': ', e.message
            flash("That is not a proper url")
            return render_template("signup.html", form=UserForm())
        if r.status_code != 200:
            flash("The url did not return a 200 status on /status")
            return render_template("signup.html", form=UserForm())
        try:
            user = User(username, base_url)
            db.session.add(user)
            db.session.commit()
        except Exception as e:
            print type(e), ': ', e.message
            flash("That name or url is taken. Please try another.")
            return render_template("signup.html", form=UserForm())
        flash("User %s signed up successfully!" % username)
        form = UserForm()
    return render_template("signup.html", form=form)

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/start-game", methods=("GET", "POST"))
def start_game():
    form = StartGameForm()
    form.players.choices = [(str(user.id), user.username) for user in User.query.all()]
    if form.validate_on_submit():
        user_ids = list(form.players.data)
        if 3 <= len(user_ids) <= 6:
            game = Game()
            for user_id in user_ids:
                user = User.query.filter(User.id == user_id).one()
                game.users.append(user)
            db.session.add(game)
            db.session.commit()
            start_risk_game.delay(user_ids, game.id)
            flash("Game added to Queue")
            redirect(url_for('index'))
        elif len(user_ids) < 3:
            flash("you need at least 3 players to start a game")
        else:
            flash("you cannont play with more than 6 players")
    return render_template("start-game.html", form=form)

@app.route("/games")
def games():
    completed_games = Game.query.filter(Game.completed).order_by(Game.id.desc()).all()
    return render_template('games.html', completed_games = completed_games)

@app.route("/watch-game/<game_id>")
def watch_game(game_id):
    game = Game.query.filter(Game.id == game_id).one()
    return render_template('watch-game.html', game = game)

@app.route("/game/<game_id>/<broadcast_count>")
def game(game_id, broadcast_count):
    game = mongo.db.game.find_one_or_404({'uid':game_id, 'broadcast_count':int(broadcast_count)})
    game = {k:game[k] for k in game if k != '_id'}
    return json.dumps(game)
