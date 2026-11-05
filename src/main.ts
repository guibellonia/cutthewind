// Entry point: the game, or a developer view when ?debug=… is set.
import { runDebug } from './debug';
import { Game } from './game/game';
import { TitleScreen } from './ui/screens/title';

const params = new URLSearchParams(location.search);
if (params.get('debug')) runDebug(params);
else {
  const game = new Game();
  (window as unknown as { game: Game }).game = game;
  game.setScreen(new TitleScreen(game));
}
