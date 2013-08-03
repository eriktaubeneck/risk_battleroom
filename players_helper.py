from risk.models import Players as BasePlayers
import json

class Players(BasePlayers):

    def __init__(self, *args):
        super(Players, self).__init__(*args)

    def broadcast_game(self, game):
        super(Players, self).broadcast_game(game)
        with app.app_context():
            mongo.db.game.insert(json.loads(game.game_state_json(None))['game'])

from app import app, mongo
