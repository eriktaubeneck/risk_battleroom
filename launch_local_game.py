from risk.models import Players
from player_helper import Player
from risk.game import Game as BaseGame
import sys
import requests
import json
import random

try:
    debug = sys.argv[2]
    if debug.lower() == 'true':
        debug = True
    else:
        debug = False
except IndexError:
    debug = False

class Game(BaseGame):
    def check_for_winner(self):
        if debug:
            raw_input('waiting')
        return super(Game, self).check_for_winner()

n_players = int(sys.argv[1])
first_port = 4444

players = Players()
for i in range(n_players):
    players.add_player(Player('player %s' % (i+1), 'http://localhost:%s' % (first_port+i)))

game = Game(players)
game.start_game()
