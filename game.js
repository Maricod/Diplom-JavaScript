'use strict';

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    plus(vector) {
        if (!(vector instanceof Vector)) {
            throw new Error("Можно прибавлять к вектору только вектор типа Vector");
        // елси будет выброшено исключение, то выполнение функции прекратится,
        // так что else можно убрать
        } else {
            return new Vector(this.x + vector.x, this.y + vector.y);
        }
    }
    times(factor) {
        return new Vector(this.x * factor, this.y * factor);
    }
}


class Actor {
    constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
        this.pos = pos;
        this.size = size;
        this.speed = speed;
        // проверки аргументо лучше делать в начале
        if (!(pos instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
            throw new Error("Не объект типа Vector");
        }
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
        // лушче возвращать сразу строку,
        // чтобы нельзя было изменить занчение извне
        this.$type = 'actor';
        return this.$type;
    }

    isIntersect(actor) {
        // вторая половина проверки лишняя
        // потому что undefined instanceof Actor это false
        if (!(actor instanceof Actor) || actor === undefined) {
            throw new Error("Неверно задан actor");
        // else можно убрать
        } else if (actor === this || actor.size.x < 0 || actor.size.y < 0) {
            return false;
        // else можно убрать
        // тут можно обратить выражение в if и написать просто
        // return <выражение>
        } else if (this.top <= actor.bottom && this.right <= actor.left || this.right <= actor.left && this.bottom >= actor.top || this.left >= actor.right && this.bottom >= actor.top || this.left >= actor.right && this.top <= actor.bottom || this.top === actor.bottom || this.right === actor.left || this.left === actor.right || this.bottom === actor.top) {
            return false;
        // else можно убрать
        } else {
            return true;
        }
    }
}

class Level {
    constructor(grid = [], actors = []) {
        // можно создать копии массивов, чтобы снизить вероятность изменения извне
        this.grid = grid;
        this.actors = actors;
        this.height = this.grid.length;
        this.width = grid.reduce((accumulator, value) => value.length > accumulator ? value.length : accumulator, 0);
        this.status = null;
        this.finishDelay = 1;
    }

    get player() {
        // лучше присвоить в конструкторе, чтобы каждый раз не искать
        // или не сохранять значение, чтобы поле нельзя было изменить извне
        this.$player = this.actors.find(value => value.type === 'player');
        return this.$player;
    }

    isFinished() {
        // тут можно написать просто return <выражение в if>
        if (this.status !== null && this.finishDelay < 0) {
            return true;
        } else {
            return false;
        }
    }

    actorAt(actor) {
        if (!(actor instanceof Actor) || actor === undefined) {
            throw new Error("Неверно передан actor");
        // это лишняя проверка
        } else if (this.top === actor.bottom || this.right === actor.left || this.left === actor.right || this.bottom === actor.top) {
            return undefined;
        } else {
            return this.actors.find(value => value.isIntersect(actor));
        }

    }
    obstacleAt(pos, size) {
        if (!(pos instanceof Vector) || !(size instanceof Vector)) {
            throw new Error("не передан объект типа Vector");
        }
        // значение присваивается переменной 1 раз,
        // поэтому лучше использовать const
        let xStart = Math.floor(pos.x);
        let xEnd = Math.ceil(pos.x + size.x);
        let yStart = Math.floor(pos.y);
        let yEnd = Math.ceil(pos.y + size.y);

        if (xStart < 0 || xEnd > this.width || yStart < 0) {
            return 'wall';
        }

        if (yEnd > this.height) {
            return 'lava';
        }

        for (let y = yStart; y < yEnd; y++) {
            for (let x = xStart; x < xEnd; x++) {
                const obstacle = this.grid[y][x];
                // можно проверить просто if (obstacle)
                if (typeof obstacle !== 'undefined') {
                    return obstacle;
                }
            }
        }
        return undefined;
    }

    removeActor(actor) {
        this.actors = this.actors.filter(el => el !== actor);
    }

    noMoreActors(type) {
        // можно убрать проверку,
        // в конструкторе есть значение по-умолчанию для этого поля
        if (this.actors) {
            // тут можно использовать метод .some массива
            for (let actor of this.actors) {
                if (actor.type === type) {
                    return false;
                }; // лишние точки с запятой
            };
        };
        return true;
    }
    playerTouched(type, actor) {
        if (this.status !== null) {
            return;
        }
        if (type === 'lava' || type === 'fireball') {
            this.status = 'lost';
        } else if (type === 'coin') {
            this.removeActor(actor);
            // тут лучше использовать метод noMoreActors
            if (!this.actors.find(value => value.type === 'coin')) {
                this.status = 'won';
            }
        }
    }
}

class LevelParser {
    // не корректный тип значения по-умолчанию
    constructor(dictionary = '{}') {
        this.dictionary = {
            ...dictionary
        };
    }
    actorFromSymbol(symbol) {
        return this.dictionary[symbol];
    }
    obstacleFromSymbol(symbol) {
        if (symbol === 'x') {
            return 'wall';
        // else можно убрать
        } else if (symbol === '!') {
            return 'lava';
        // лишняя ветка
        } else if (symbol !== 'x' && symbol !== '!') {
            return undefined;
        }
    }

    createGrid(plan) {
        // лучше явно указывать вызов функции,
        // сечас у вас в obstacleFromSymbol будет передаваться 3 армента
        return plan.map(row => row.split('').map(this.obstacleFromSymbol));
    }

    createActors(plan) {
        // actor лучше назвать line, наверное
        return plan.reduce((result, actor, j) => {
            return result.concat(actor.split('').reduce((result, char, i) => {
                const func = this.actorFromSymbol(char);
                if (typeof func === "function") {
                    const actor = new func(new Vector(i, j));
                    if (actor instanceof Actor) {
                        result.push(actor);
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
        // тут лучше использовать методы класса Vector
        return new Vector(this.pos.x + this.speed.x * time, this.pos.y + this.speed.y * time);
    }

    handleObstacle() {
        this.speed = this.speed.times(-1);
    }

    act(time, level) {
        // если значение присваивается 1 раз,
        // то лучше исопльзовать const,
        // если несколько, то let
        var newPosition = this.getNextPosition(time);

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
        super(pos, new Vector(0.6, 0.6));
        // pos должен задаваться через вызов родительского конструктора
        this.pos = new Vector(this.pos.x + 0.2, this.pos.y + 0.1);
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
