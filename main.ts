/////////////
// Classes //
/////////////
class DynamicSprite {
    protected _sprite: Sprite;
    protected _animation = '';

    constructor(image: Image, x: number, y: number, spriteKind: number) {
        this._sprite = sprites.create(image, SpriteKind.Player);
        this._sprite.setPosition(x, y);
    }

    get sprite() {
        return this._sprite;
    }

    get animation() {
        return this._animation;
    }

    animate(
        frames: Image[],
        name: string,
        frameInterval?: number,
        loop?: boolean,
        overwrite?: boolean,
    ) {
        if (!overwrite && this._animation == name) return;
        animation.runImageAnimation(this._sprite, frames, frameInterval, loop);
        this._animation = name;
    }

    stopAnimation() {
        animation.stopAnimation(animation.AnimationTypes.All, this._sprite);
        this._animation = '';
    }
}

class Player extends DynamicSprite {
    public direction = 'down';
    public rocks = 10;

    constructor(image: Image, x: number, y: number) {
        super(image, x, y, SpriteKind.Player);
        controller.moveSprite(this._sprite);
        scene.cameraFollowSprite(this._sprite);
    }

    public throwRock() {
        if (this.rocks <= 0) return;

        const speed = 125;
        let vx = 0;
        let vy = 0;

        switch (this.direction) {
            case 'up':
                vy = -speed;
                break;
            case 'down':
                vy = speed;
                break;
            case 'left':
                vx = -speed;
                break;
            case 'right':
                vx = speed;
                break;
        }

        let rock = sprites.createProjectileFromSprite(
            sprites.castle.rock0,
            this._sprite,
            this._sprite.vx + vx,
            this._sprite.vy + vy,
        );
        this.rocks--;
    }
}

class Enemy extends DynamicSprite {
    constructor(image: Image, follow: Sprite, x: number, y: number) {
        super(image, x, y, SpriteKind.Enemy);
        this._sprite.follow(follow, 50);
    }
}

class HUD {
    private player: Player;
    private ammoText: TextSprite;

    constructor(player: Player) {
        this.player = player;

        this.ammoText = textsprite.create('');
        this.ammoText.setOutline(1, 15);
    }

    public update() {
        this.ammoText.text = `Rocks: ${this.player.rocks}`;
        this.ammoText.right = scene.cameraProperty(CameraProperty.Right);
        this.ammoText.bottom = scene.cameraProperty(CameraProperty.Bottom);
        this.ammoText.update();
    }
}

class MainMenu {
    private static title: TextSprite;
    private static title2: TextSprite;
    private static subtitle: TextSprite;
    private static subtitle2: TextSprite;
    private static selectable = [] as Array<TextSprite>;
    private static _selected = 0;

    public static get selected() {
        return this._selected;
    }

    public static init() {
        this.title = textsprite.create('Welcome to (yet another)');
        this.title2 = textsprite.create('Maze Game!');
        this.subtitle = textsprite.create('Find the exit');
        this.subtitle2 = textsprite.create('as fast as possible.');
        this.selectable.push(textsprite.create('Level 1 (easy)'));
        this.selectable.push(textsprite.create('Level 2 (mid)'));
        this.selectable.push(textsprite.create('Level 3 (hard)'));
        this.selectable.push(textsprite.create('Random (easy)'));
        this.selectable.push(textsprite.create('Random (mid)'));
        this.selectable.push(textsprite.create('Random (hard)'));
        this.update();
    }

    public static hide() {
        this.title.destroy();
        this.title2.destroy();
        this.subtitle.destroy();
        this.subtitle2.destroy();
        this.selectable.forEach((text) => {
            text.destroy();
        });
    }

    public static update() {
        this.title.setPosition(screen.width / 2, 10);
        this.title2.setPosition(screen.width / 2, 20);
        this.subtitle.setPosition(screen.width / 2, 30);
        this.subtitle2.setPosition(screen.width / 2, 40);


        for (let i = 0; i < this.selectable.length; i++) {
            let text = this.selectable[i];

            text.bg = 0;
            text.fg = 1;
            text.padding = 1;
            text.update();

            text.setPosition(screen.width / 2, 60 + i * 10)
        }
        this.selectable[this._selected].bg = 1;
        this.selectable[this._selected].fg = 15;
        this.selectable[this._selected].update();
    }

    public static moveUp() {
        if (started) return;
        this._selected--;
        if (this._selected < 0) this._selected = this.selectable.length - 1;
        this.update();
        music.playMelody('E5', 1000);
    }

    public static moveDown() {
        if (started) return;
        this._selected++;
        if (this._selected > this.selectable.length - 1) this._selected = 0;
        this.update();
        music.playMelody('C5', 1000);
    }
}

class Grid<T> {
    private _width: number;
    private _height: number;
    private array = [] as Array<Array<T>>;

    constructor(width: number, height: number, fill: T) {
        this._width = width;
        this._height = height;
        for (let x = 0; x <= width - 1; x++) {
            this.array.push([]);
            for (let y = 0; y <= height - 1; y++) this.array[x].push(fill);
        }
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    public get(x: number, y: number) {
        return this.array[x][y];
    }

    public set(x: number, y: number, value: T) {
        this.array[x][y] = value;
    }

    public exists(x: number, y: number) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) return true;
        else return false;
    }

    public forEach(callback: (value: T, x?: number, y?: number) => void) {
        for (let x = 0; x < this._width; x++) {
            for (let y = 0; y < this._height; y++) callback(this.array[x][y], x, y);
        }
    }
}

//////////
// Main //
//////////
let started = false;
MainMenu.init();
let menuTime: number;

tiles.setCurrentTilemap(assets.tilemap`tilemap`);
let player: Player;
// let enemy: Enemy;
let hud: HUD;

// Controller
controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
    MainMenu.moveUp();
});

controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
    MainMenu.moveDown();
});

controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    if (!started) {
        switch (MainMenu.selected) {
            case 0:
                startlvl(1);
                break;
            case 1:
                startlvl(2);
                break;
            case 2:
                startlvl(3);
                break;
            case 3:
                startlvl(1, true);
                break;
            case 4:
                startlvl(2, true);
                break;
            case 5:
                startlvl(3, true);
                break;
        }
        music.playMelody('G5', 1000);
    } else {
        //player.throwRock();
    }
});

sprites.onOverlap(
    SpriteKind.Player,
    SpriteKind.Food,
    function (sprite: Sprite, otherSprite: Sprite) {
        music.jumpUp.play();
        game.showLongText(
            `You finished in ${(game.runtime() - menuTime) / 1000} seconds!`,
            DialogLayout.Center,
        );
        game.over(true);
    },
);

function startlvl(num: number, random?: boolean) {
    started = true;
    menuTime = game.runtime();

    player = new Player(assets.animation`plyfront`[0], 24, 24);
    //enemy = new Enemy(sprites.builtin.cat0, player.sprite, 24, 24);
    MainMenu.hide();

    //hud = new HUD(player);

    let seed: number;
    if (!random) seed = num;
    else seed = Math.random();

    switch (num) {
        case 1:
            Maze.genMaze(
                25,
                25,
                [
                    sprites.castle.saplingOak,
                    sprites.castle.saplingPine,
                    sprites.castle.shrub,
                ],
                [
                    sprites.castle.tileGrass1,
                    sprites.castle.tileGrass2,
                    sprites.castle.tileGrass3,
                ],
                3,
                seed.toString(),
            );
            placeEnd(seed.toString());
            break;
        case 2:
            Maze.genMaze(
                25,
                25,
                [
                    sprites.dungeon.floorLight0,
                    sprites.dungeon.floorLight1,
                    sprites.dungeon.floorLightMoss,
                ],
                [
                    sprites.dungeon.floorDark2,
                    sprites.dungeon.floorDarkDiamond,
                    sprites.dungeon.floorDark5,
                ],
                2,
                seed.toString(),
            );
            placeEnd(seed.toString());
            break;
        case 3:
            Maze.genMaze(
                25,
                25,
                [
                    sprites.vehicle.carRedBack,
                    sprites.vehicle.carRedFront,
                    sprites.vehicle.carRedLeft,
                    sprites.vehicle.carRedRight,
                    sprites.vehicle.carBlueBack,
                    sprites.vehicle.carBlueFront,
                    sprites.vehicle.carBlueLeft,
                    sprites.vehicle.carBlueRight,
                    sprites.vehicle.carPinkBack,
                    sprites.vehicle.carPinkFront,
                    sprites.vehicle.carPinkLeft,
                    sprites.vehicle.carPinkRight,
                ],
                [sprites.dungeon.darkGroundCenter],
                1,
                seed.toString(),
            );
            placeEnd(seed.toString());
    }
}

function placeEnd(seed?: string) {
    let corner: number;
    let col: number;
    let row: number;

    if (seed) corner = PRNG.seedRandomRange(seed, 1, 3);
    else corner = Math.randomRange(1, 3);

    let end = sprites.create(sprites.dungeon.chestClosed, SpriteKind.Food);

    switch (corner) {
        case 1:
            col = 23;
            row = 23;
            break;
        case 2:
            col = 1;
            row = 23;
            break;
        case 3:
            col = 23;
            row = 1;
    }
    end.setPosition(
        tiles.getTileLocation(col, row).x,
        tiles.getTileLocation(col, row).y,
    );
}

// Game tick
game.onUpdate(() => {
    if (!started) return;

    // HUD
    //hud.update();
    info.startCountdown((game.runtime() - menuTime) / 1000);

    // Animations
    if (player.sprite.vx < 0) {
        player.animate(assets.animation`plyleft`, 'plyleft', 150, true);
        player.direction = 'left';
    } else if (player.sprite.vx > 0) {
        player.animate(assets.animation`plyright`, 'plyright', 150, true);
        player.direction = 'right';
    } else if (player.sprite.vy > 0) {
        player.animate(assets.animation`plyfront`, 'plyfront', 150, true);
        player.direction = 'down';
    } else if (player.sprite.vy < 0) {
        player.animate(assets.animation`plyback`, 'plyback', 150, true);
        player.direction = 'up';
    } else {
        player.stopAnimation();
    }
});

// Footsteps
game.onUpdateInterval(250, function() {
    if (started && (player.sprite.vx !== 0 || player.sprite.vy !== 0)) {
        music.footstep.play();
    }
})

////////////////////
// Maze algorithm //
////////////////////
// Source: https://en.wikipedia.org/wiki/Maze_generation_algorithm#Randomized_Prim's_algorithm
namespace Maze {
    export function genMaze(
        width: number,
        height: number,
        wallImage: Image[],
        pathImage: Image[],
        pathWidth: number,
        seed?: string,
    ) {
        if (!(width % 2) || !(height % 2)) throw 'Dimensions must be odd.';

        // Fill
        let walls = new Grid(width, height, true);
        for (let x = 0; x <= width - 1; x++) {
            for (let y = 0; y <= height - 1; y++) {
                if (!seed)
                    tiles.setTileAt(
                        tiles.getTileLocation(x, y),
                        pathImage[Math.randomRange(0, pathImage.length - 1)],
                    );
                else
                    tiles.setTileAt(
                        tiles.getTileLocation(x, y),
                        pathImage[
                        PRNG.seedRandomRange(`${seed}${x}${y}`, 0, pathImage.length - 1)
                        ],
                    );
                tiles.setWallAt(tiles.getTileLocation(x, y), true);
            }
        }

        // Maze
        let tempPath = [{ x: 1, y: 1, parent: { x: 1, y: 1 } }];
        let path = new Grid(width, height, false);

        for (let i = 0; tempPath.length > 0; i++) {
            // Pick a random tile from the list
            let rand: number;
            if (!seed) rand = Math.randomRange(0, tempPath.length - 1);
            else rand = PRNG.seedRandomRange(seed + i, 0, tempPath.length - 1);

            // Connect the randomly chosen tile to the parent tile
            path.set(tempPath[rand].x, tempPath[rand].y, true);
            if (tempPath[rand].x > tempPath[rand].parent.x)
                for (let x = tempPath[rand].x - 1; x > tempPath[rand].parent.x; x--) {
                    path.set(x, tempPath[rand].y, true);
                }
            if (tempPath[rand].y > tempPath[rand].parent.y)
                for (let y = tempPath[rand].y - 1; y > tempPath[rand].parent.y; y--) {
                    path.set(tempPath[rand].x, y, true);
                }
            if (tempPath[rand].x < tempPath[rand].parent.x)
                for (let x = tempPath[rand].x + 1; x < tempPath[rand].parent.x; x++) {
                    path.set(x, tempPath[rand].y, true);
                }
            if (tempPath[rand].y < tempPath[rand].parent.y)
                for (let y = tempPath[rand].y + 1; y < tempPath[rand].parent.y; y++) {
                    path.set(tempPath[rand].x, y, true);
                }

            // Prepare all tiles that are next to the randomly chosen tile
            const up = {
                x: tempPath[rand].x,
                y: tempPath[rand].y - 1 - pathWidth,
                parent: tempPath[rand],
            };
            const down = {
                x: tempPath[rand].x,
                y: tempPath[rand].y + 1 + pathWidth,
                parent: tempPath[rand],
            };
            const left = {
                x: tempPath[rand].x - 1 - pathWidth,
                y: tempPath[rand].y,
                parent: tempPath[rand],
            };
            const right = {
                x: tempPath[rand].x + 1 + pathWidth,
                y: tempPath[rand].y,
                parent: tempPath[rand],
            };

            // Add all available tiles that are next to the chosen tile to the list
            if (
                !tempPath.find((c) => c.x == up.x && c.y == up.y) && // Check for duplicates in tempPath
                path.exists(up.x, up.y) && // Check if the tile is in bounds
                !path.get(up.x, up.y) // Check for duplicates in path
            )
                tempPath.push(up); // Add the tile to tempPath
            if (
                !tempPath.find((c) => c.x == down.x && c.y == down.y) &&
                path.exists(down.x, down.y) &&
                !path.get(down.x, down.y)
            )
                tempPath.push(down);
            if (
                !tempPath.find((c) => c.x == left.x && c.y == left.y) &&
                path.exists(left.x, left.y) &&
                !path.get(left.x, left.y)
            )
                tempPath.push(left);
            if (
                !tempPath.find((c) => c.x == right.x && c.y == right.y) &&
                path.exists(right.x, right.y) &&
                !path.get(right.x, right.y)
            )
                tempPath.push(right);

            // Remove the randomly chosen tile from the list
            tempPath.removeAt(rand);
        }

        // Draw the path
        path.forEach((path, x, y) => {
            // Widen the path according to pathWidth
            for (let xOffset = 0; xOffset < pathWidth; xOffset++) {
                for (let yOffset = 0; yOffset < pathWidth; yOffset++) {
                    if (path) {
                        walls.set(x + xOffset, y + yOffset, false);
                        tiles.setWallAt(
                            tiles.getTileLocation(x + xOffset, y + yOffset),
                            false,
                        );
                    }
                }
            }
        });

        // Draw the maze walls
        walls.forEach((wall, x, y) => {
            if (wall) {
                let img = tiles.getTileImage(tiles.getTileLocation(x, y)).clone();
                if (!seed)
                    img.drawTransparentImage(
                        wallImage[Math.randomRange(0, wallImage.length - 1)],
                        0,
                        0,
                    );
                else
                    img.drawTransparentImage(
                        wallImage[
                        PRNG.seedRandomRange(`${seed}${x}${y}`, 0, wallImage.length - 1)
                        ],
                        0,
                        0,
                    );
                tiles.setTileAt(tiles.getTileLocation(x, y), img);
            }
        });
    }
}

////////////////////////////////////
// Pseudo random number generator //
////////////////////////////////////
// Source: https://github.com/bryc/code/blob/master/jshash/PRNGs.md
// I have no idea how this works
namespace PRNG {
    export function xmur3(str: string) {
        let h = 1779033703 ^ str.length;
        for (let i = 0; i < str.length; i++)
            (h = Math.imul(h ^ str.charCodeAt(i), 3432918353)),
                (h = (h << 13) | (h >>> 19));
        (h = Math.imul(h ^ (h >>> 16), 2246822507)),
            (h = Math.imul(h ^ (h >>> 13), 3266489909));
        return (h ^= h >>> 16) >>> 0;
    }

    export function mulberry32(a: number) {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    export function seedRandom(str: string) {
        return mulberry32(xmur3(str));
    }

    export function seedRandomRange(str: string, min: number, max: number) {
        return Math.floor(seedRandom(str) * (max - min + 1) + min);
    }
}
