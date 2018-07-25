'use strict';

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    plus(vector) {
        if (!(vector instanceof Vector)) {
            throw new Error("Можно прибавлять к вектору только вектор типа Vector");
        }
        return new Vector(this.x + vector.x, this.y + vector.y);

    }
    times(factor) {
        return new Vector(this.x * factor, this.y * factor);
    }
}


class Actor {
    constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
        if (!(pos instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
            throw new Error("Не объект типа Vector");
        }
        this.pos = pos;
        this.size = size;
        this.speed = speed;
    }
    act() {}

    get left() {
        return this.pos.x;
    }
    get top() {
        return this.pos.y;
    }
    get right() {
        return this.pos.x + this.size.x;
    }
    get bottom() {
        return this.pos.y + this.size.y;
    }

    get type() {
        return 'actor';
    }

    isIntersect(actor) {
        if (!(actor instanceof Actor)) {
            throw new Error("Неверно задан actor");
        }

        // вторая и третья проверки - лишние
        if (actor === this || actor.size.x < 0 || actor.size.y < 0) {
            return false;
        }
        // вот здесь ошибка
        // должно быть 4 условия (выше, левее, правее или ниже)
        if (this.top <= actor.bottom && this.right <= actor.left || this.right <= actor.left && this.bottom >= actor.top || this.left >= actor.right && this.bottom >= actor.top || this.left >= actor.right && this.top <= actor.bottom || this.top === actor.bottom || this.right === actor.left || this.left === actor.right || this.bottom === actor.top) {
            return false;
        }
        return true;

    }
}

class Level {
    constructor(grid = [], actors = []) {
        this.grid = grid.slice();
        this.actors = actors.slice();
        this.height = this.grid.length;
        this.width = grid.reduce((accumulator, value) => value.length > accumulator ? value.length : accumulator, 0);
        this.status = null;
        this.finishDelay = 1;
        this.player = this.actors.find(value => value.type === 'player');
    }

    isFinished() {
        return this.status !== null && this.finishDelay < 0;
    }

   actorAt(actor) {
        if (!(actor instanceof Actor)) {
            throw new Error("Неверно передан actor");
        }
        return this.actors.find(value => value.isIntersect(actor));

    }
    obstacleAt(pos, size) {
        if (!(pos instanceof Vector) || !(size instanceof Vector)) {
            throw new Error("не передан объект типа Vector");
        }
        const xStart = Math.floor(pos.x);
        const xEnd = Math.ceil(pos.x + size.x);
        const yStart = Math.floor(pos.y);
        const yEnd = Math.ceil(pos.y + size.y);


        if (xStart < 0 || xEnd > this.width || yStart < 0) {
            return 'wall';
        }

        if (yEnd > this.height) {
            return 'lava';
        }

        for (let y = yStart; y < yEnd; y++) {
            for (let x = xStart; x < xEnd; x++) {
                const obstacle = this.grid[y][x];
                if (obstacle) {
                    return obstacle;
                }
            }
        }

        // лишняя строчка, функция и так возвращает undefined, если не указано иное
        return undefined;
    }

    removeActor(actor) {
        this.actors = this.actors.filter(el => el !== actor);
    }

    noMoreActors(type) {
        // скобки вокруг actor можно убрать
        return !this.actors.some((actor) => actor.type === type);
    }
    playerTouched(type, actor) {
        if (this.status !== null) {
            return;
        }
        if (type === 'lava' || type === 'fireball') {
            this.status = 'lost';
        } else if (type === 'coin') {
            this.removeActor(actor);
            if (this.noMoreActors('coin')) {
                this.status = 'won';
            }
        }
    }
}

class LevelParser {
    constructor(dictionary) {
        this.dictionary = Object.assign({}, dictionary);
    }
    actorFromSymbol(symbol) {
        return this.dictionary[symbol];
    }
    obstacleFromSymbol(symbol) {
        if (symbol === 'x') {
            return 'wall';
        }
        if (symbol === '!') {
            return 'lava';
        }
    }

    createGrid(plan) {
        // не называйте аргументы одинаково, так легко запутаться
        return plan.map(row => row.split('')).map(row => row.map(row => this.obstacleFromSymbol(row)));
    }

    createActors(plan) {
        return plan.reduce((result, line, j) => {
            // перемудрили, тут можно либо передавать родительский result
            // в начальное значение reduce
            // или просто использовать forEach
            return result.concat(line.split('').reduce((result, char, i) => {
                const func = this.actorFromSymbol(char);
                if (typeof func === "function") {
                    const line = new func(new Vector(i, j));
                    if (line instanceof Actor) {
                        result.push(line);
                    }
                }
                return result;
            }, []));
        }, []);
    }
    parse(plan) {
        return new Level(this.createGrid(plan), this.createActors(plan));
    }
}

class Fireball extends Actor {
    constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
        super(pos, new Vector(1, 1), speed);
    }

    get type() {
        return 'fireball';
    }

    getNextPosition(time = 1) {
        return this.pos.plus(this.speed.times(time));
    }

    handleObstacle() {
        this.speed = this.speed.times(-1);
    }

    act(time, level) {
        let newPosition = this.getNextPosition(time);

        if (level.obstacleAt(newPosition, this.size)) {

            this.handleObstacle();

        } else {

            this.pos = newPosition;
        }
    }
}


class HorizontalFireball extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        super(pos, new Vector(2, 0));
    }

}

class VerticalFireball extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        super(pos, new Vector(0, 2));
    }

}

class FireRain extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        super(pos, new Vector(0, 3));
        this.startPos = this.pos;
    }

    handleObstacle() {
        this.pos = this.startPos;
    }
}

class Coin extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = Math.random() * (Math.PI * 2);
        this.startPos = this.pos;
    }

    get type() {
        return 'coin';
    }

    updateSpring(time = 1) {
        this.spring = this.spring + this.springSpeed * time;
    }

    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist);
    }

    getNextPosition(time = 1) {
        this.updateSpring(time)
        return this.startPos.plus(this.getSpringVector());
    }

    act(time) {
        this.pos = this.getNextPosition(time);
    }
}

class Player extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
    }

    get type() {
        return 'player';
    }
}


const schemas = [
    [
        '         ',
        '         ',
        '    =    ',
        '       o ',
        '     !xxx',
        ' @       ',
        'xxx!     ',
        '         '
    ],
    [
        '      v  ',
        '    v    ',
        '  v      ',
        '        o',
        '        x',
        '@   x    ',
        'x        ',
        '         '
    ]
];
const actorDict = {
    '@': Player,
    'v': FireRain,
    '=': HorizontalFireball,
    'o': Coin
};
const parser = new LevelParser(actorDict);
runGame(schemas, parser, DOMDisplay)
    .then(() => console.log('Вы выиграли приз!'));
