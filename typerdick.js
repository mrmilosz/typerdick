"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
/*
 * © new Date().getFullYear() Milosz Kosmider and Adam Bielinski
 * License: http://www.dbad-license.org/
 */
(function () {
    var options = {
        minimumSpeed: 0.5,
        acceleration: 0.05,
        speedLossOnSlow: 0.2,
        gridWidth: 30,
        gridHeight: 20,
        initialColumnCount: 5,
        probabilities: {
            // [0, 1]
            score: 1 / 10,
            slow: 1 / 120,
            block: 1 / 60,
        },
    };
    Object.freeze(options.probabilities);
    Object.freeze(options);
    document.addEventListener("DOMContentLoaded", function () {
        // start the renderer
        //  var renderer = CanvasTyperdickRenderer.new(document.querySelector('.main'));
        var renderer = HtmlTyperdickRenderer.new(document.querySelector(".main"));
        // start the game
        var game = Game.new(options, renderer);
    });
    /**
     * Base: the base object, without which I never leave home
     */
    var Base = Object.create([]);
    /** creates and returns a Base after initializing it */
    Base.new = function () {
        var clone = Object.create(this);
        clone.initialize.apply(clone, arguments);
        return clone;
    };
    Base.initialize = function () { };
    /**
     * Timer: keeps the bullshit synchronized
     */
    var Timer = Object.create(Base);
    Timer.initialize = function () {
        this._tickActions = [];
        this._isPaused = true;
        this.reset();
    };
    Timer.getTotalElapsedTime = function () {
        return !this._isPaused
            ? // total time elapsed = now - previous
                Date.now() - this._previousTime
            : this._savedElapsedTime;
    };
    /** animation loop */
    Timer._tick = function () {
        var _this = this;
        var tick = function () {
            if (_this._isPaused) {
                return;
            }
            else {
                requestAnimationFrame(tick);
                var totalElapsedTime_1 = _this.getTotalElapsedTime();
                // (relative) = (total) - (last tick)
                _this._relativeElapsedTime =
                    totalElapsedTime_1 - _this._lastTickElapsedTime;
                // * perform all tick actions e.g. ...?
                _this._tickActions.forEach(function (tickAction) {
                    tickAction(_this._relativeElapsedTime, totalElapsedTime_1);
                });
                _this._lastTickElapsedTime = totalElapsedTime_1;
            }
        };
        tick();
    };
    // start running again if we're paused
    Timer.run = function () {
        if (this._isPaused) {
            // * previous time = now - saved time - what's this for?
            this._previousTime = Date.now() - this._savedElapsedTime;
            // unpause
            this._isPaused = false;
            this._tick();
        }
    };
    // pause if we're running
    Timer.pause = function () {
        if (!this._isPaused) {
            this._savedElapsedTime = this.getTotalElapsedTime();
            this._isPaused = true;
        }
    };
    // reset all to 0 & pause
    Timer.reset = function () {
        this._previousTime = Date.now();
        this._lastTickElapsedTime = 0;
        this._savedElapsedTime = 0;
        this._isPaused = true;
    };
    Timer.isPaused = function () {
        return this._isPaused;
    };
    Timer.addTickAction = function (tickAction) {
        this._tickActions.push(tickAction);
    };
    /**
     * Player: avatar of the frail human mind
     */
    var Player = Object.create(Base);
    Player.initialize = function (x, y) {
        this.x = x;
        this.y = y;
    };
    /**
     * Cell: the smallest unit of bullshit
     */
    var Cell = Object.create(Base);
    Cell.initialize = function () {
        this.type = 0;
        this.label = "";
        this.data = {};
    };
    Cell.modifiers = {
        score: 1,
        slow: 2,
        block: 4,
    };
    /**
     * Column: the medium unit of bullshit
     */
    var Column = Object.create(Base);
    Column.initialize = function () {
        this.data = {};
    };
    /**
     * Grid: the bullshit organizer
     */
    var Grid = Object.create(Base);
    Grid.initialize = function (width, height, probabilities) {
        this.width = width;
        this.height = height;
        this._bufferedWidth = this.width + 1; // plus 1 for the hidden column
        this._probabilities = probabilities;
        // make {_bufferedWidth} new columns,
        for (var x = 0; x < this._bufferedWidth; ++x) {
            var column = Column.new();
            // and push {height} many cells into each
            for (var y = 0; y < this.height; ++y) {
                column.push(Cell.new());
            }
            this.push(column);
        }
    };
    Grid.getCell = function (x, y) {
        var column = this[x];
        if (column === undefined) {
            return undefined;
        }
        return this[x][y];
    };
    Grid.cycle = function () {
        var column = this[0];
        for (var y = 0; y < column.length; ++y) {
            var cell = column[y];
            // A string containing all the letters that can't be used for the current cell
            var clashingCellLabels = this[this.length - 2]
                .slice(Math.max(y - 2, 0), y + 3)
                .concat(
            // One column back, two cells above and below
            this[this.length - 1].slice(Math.max(y - 2, 0), y + 3))
                .concat(
            // Two columns back, two cells above and below
            // Current column, two cells above
            column.slice(Math.max(y - 2, 0), y))
                .reduce(function (labelString, cell) {
                return labelString + cell.label.toUpperCase();
            }, "");
            // A string containing all the valid letters
            var possibleCellLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".replace(new RegExp("[" + clashingCellLabels + "]", "g"), "");
            // The single valid chosen letter
            var currentCellLabel = possibleCellLabels[parseInt("" + Math.random() * possibleCellLabels.length)];
            // Relabel and reset modifiers
            cell.label = currentCellLabel;
            cell.type = 0;
            // Apply new modifiers if the Gods will it
            for (var modifierName in this._probabilities) {
                if (Math.random() < this._probabilities[modifierName]) {
                    cell.type |= Cell.modifiers[modifierName];
                }
            }
        }
        // Cycle the array
        this.push(this.shift());
    };
    Grid.toString = function () {
        var _this = this;
        // rows of the grid, e.g. AOUQ-EOO|SOBAWNGUI|WJANU-HELLO
        var rows = __spreadArrays(new Array()).map(function (_) { return ""; });
        // for each grid?
        this.forEach(function (column, x) {
            // for each column
            column.forEach(function (cell, y) {
                var isEndOfRow = x === _this.width;
                // add the cell to the column
                rows[y] = rows[y] + (isEndOfRow ? "|" : "") + (cell.label || "-");
            });
        });
        return rows.join("\n");
    };
    /**
     * Game: that which gives the bullshit meaning
     */
    var Game = Object.create(Base);
    Game.initialize = function (options, renderer) {
        var _this = this;
        this._renderer = renderer;
        this._minimumSpeed = options.minimumSpeed;
        this._acceleration = options.acceleration;
        this._speedLossOnSlow = options.speedLossOnSlow;
        this._speed = this._minimumSpeed;
        this._offset = 0;
        this._position = 0;
        this._score = 0;
        this._started = false;
        this._over = false;
        // Make a timer
        this._timer = Timer.new();
        // Create the player
        this._player = Player.new(options.gridWidth - options.initialColumnCount + 2, parseInt("" + options.gridHeight / 2));
        // Make a grid
        this._grid = Grid.new(options.gridWidth, options.gridHeight, options.probabilities);
        // Buffer up some columns so the player isn't just floating in nothingness
        for (var i = 0; i < options.initialColumnCount; ++i) {
            /* let column =  */ this._grid.cycle();
        }
        // Clear some room around the player. The player can't be getting points right away. Jesus.
        var _a = this._player, x = _a.x, y = _a.y;
        [
            this._grid.getCell(x - 1, y - 1),
            this._grid.getCell(x + 0, y - 1),
            this._grid.getCell(x + 1, y - 1),
            this._grid.getCell(x - 1, y + 0),
            this._grid.getCell(x + 0, y + 0),
            this._grid.getCell(x + 1, y + 0),
            this._grid.getCell(x - 1, y + 1),
            this._grid.getCell(x + 0, y + 1),
            this._grid.getCell(x + 1, y + 1),
        ].forEach(function (cell) {
            if (cell !== undefined) {
                cell.type = 0;
            }
        });
        // Hit it!
        this._renderer.handle("setup", this._grid, this._player);
        // Try to move the grid once per tick
        this._timer.addTickAction(function (relativeElapsedTime, totalElapsedTime) {
            var relativeElapsedTimeInSeconds = relativeElapsedTime / 1000;
            _this._offset += _this._speed * relativeElapsedTimeInSeconds;
            _this._position += _this._speed * relativeElapsedTimeInSeconds;
            while (_this._offset >= 1) {
                _this._offset -= 1;
                _this._grid.cycle();
                _this._renderer.handle("cycle", _this._grid);
                _this._player.x -= 1;
                if (_this._player.x < 0) {
                    _this.lose();
                }
            }
            _this._renderer.handle("scroll", _this._offset, _this._position);
            _this._renderer.handle("time", totalElapsedTime / 1000);
            _this._renderer.handle("speed", _this._speed);
            _this._speed += _this._acceleration * relativeElapsedTimeInSeconds;
        });
        /*
         * Input handling
         */
        // TODO: consider whether or not this should be in another module
        // Handle user input
        window.addEventListener("keydown", function (event) {
            //  backspace          and tab  are nuisances
            if (event.which === 8 || event.which === 9) {
                event.preventDefault();
                return;
            }
            //       game over  or  modifier key was pressed                         or  not a letter
            else if (_this._over ||
                event.shiftKey ||
                event.ctrlKey ||
                event.altKey ||
                event.which < 65 ||
                event.which > 91) {
                return;
            }
            event.preventDefault();
            var label = String.fromCharCode(event.which);
            var _a = _this._player, x = _a.x, y = _a.y;
            var targetCell = null;
            // Find the right cell among the neighbors
            [
                _this._grid.getCell(x - 1, y - 1),
                _this._grid.getCell(x + 0, y - 1),
                _this._grid.getCell(x + 1, y - 1),
                _this._grid.getCell(x - 1, y + 0),
                ,
                _this._grid.getCell(x + 1, y + 0),
                _this._grid.getCell(x - 1, y + 1),
                _this._grid.getCell(x + 0, y + 1),
                _this._grid.getCell(x + 1, y + 1),
            ].forEach(function (cell, index) {
                if (cell !== undefined && cell.label === label) {
                    targetCell = cell;
                    x = _this._player.x + (index % 3) - 1;
                    y = _this._player.y + parseInt("" + index / 3) - 1;
                }
                return "hello how are you today?";
            });
            // Nowhere to go.
            if (targetCell === null) {
                return;
            }
            // Can't go to a blocked cell. Sucka.
            if (targetCell.type & Cell.modifiers.block) {
                return;
            }
            // A slow cell will slow down the game.
            if (targetCell.type & Cell.modifiers.slow) {
                _this._speed = Math.max(_this._minimumSpeed, _this._speed - _this._speedLossOnSlow);
                targetCell.type &= ~Cell.modifiers.slow;
            }
            // A score cell will... well... give you points! Hehe!
            if (targetCell.type & Cell.modifiers.score) {
                _this._score += 1;
                targetCell.type &= ~Cell.modifiers.score;
                _this._renderer.handle("score", _this._score);
            }
            _this._renderer.handle("cell", targetCell);
            _this._player.x = x;
            _this._player.y = y;
            _this._renderer.handle("move", _this._player, targetCell);
            if (_this._player.x < 0) {
                _this.lose();
            }
            if (!_this._started) {
                _this.run();
                _this._started = true;
                _this._renderer.handle("start");
            }
        });
        // Handle window focussing and blurring
        window.addEventListener("focus", function () {
            if (_this._started) {
                _this.run();
            }
        });
        window.addEventListener("blur", function () {
            if (_this._started) {
                _this.pause();
            }
        });
    };
    Game.run = function () {
        if (!this._over) {
            this._timer.run();
            this._renderer.handle("run");
        }
    };
    Game.pause = function () {
        this._timer.pause();
        this._renderer.handle("pause");
    };
    Game.lose = function () {
        this._timer.pause();
        this._over = true;
        this._renderer.handle("lose", this._score, this._speed, this._timer.getTotalElapsedTime());
    };
    /**
     * Renderer: that which allows frail human minds to perceive and interact with the bullshit
     */
    var Renderer = Object.create(Base);
    Renderer.initialize = function () {
        this._handlers = {};
    };
    Renderer.handle = function (eventName) {
        var _this = this;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var eventHandlersList = this._handlers[eventName];
        if (eventHandlersList !== undefined) {
            eventHandlersList.forEach(function (handler) {
                handler.apply(_this, args);
            });
        }
    };
    Renderer._addHandler = function (eventName, handler) {
        if (this._handlers[eventName] === undefined) {
            this._handlers[eventName] = [];
        }
        this._handlers[eventName].push(handler);
    };
    /**
     * TyperdickRenderer: common, but non-generic functionality
     */
    var TyperdickRenderer = Object.create(Renderer);
    TyperdickRenderer.initialize = function (mainNode) {
        var _this = this;
        Renderer.initialize.call(this);
        this._fontSizeMultiplier = 0.85;
        this._gameNode = mainNode.querySelector(".game");
        this._statusNode = mainNode.querySelector(".status");
        this._instructionsNode = mainNode.querySelector(".instructions");
        this._playerNode = mainNode.querySelector(".player");
        this._crosshairNode = mainNode.querySelector(".crosshair");
        this._loseOverlayNode = mainNode.querySelector(".lose.overlay");
        this._addHandler("lose", function (score, speed, time) {
            _this._loseOverlayNode.querySelector(".tweet").setAttribute("href", "https://twitter.com/intent/tweet?" + [
                [
                    "text",
                    "I only scored " +
                        score +
                        " points in Typerdick: the dickishly hard typing game",
                ],
                //      ['hashtags', 'typerdick'                                                                      ] ,
                ["url", "http://typerdick.com"],
            ]
                .map(function (item) {
                return encodeURIComponent(item[0]) + "=" + encodeURIComponent(item[1]);
            })
                .join("&"));
            _this._loseOverlayNode.classList.add("visible");
        });
        this._addHandler("score", function (value) {
            _this._statusNode.querySelector(".score.field").textContent = "" + value;
        });
        this._addHandler("speed", function (value) {
            _this._statusNode.querySelector(".speed.field").textContent = Number(value).toFixed(2);
        });
        this._addHandler("time", function (value) {
            _this._statusNode.querySelector(".time.field").textContent = Number(value).toFixed(1);
        });
    };
    /**
     * HTMLRenderer: for browsers that don't support canvas
     */
    var HtmlTyperdickRenderer = Object.create(TyperdickRenderer);
    HtmlTyperdickRenderer.initialize = function (mainNode) {
        var _this = this;
        TyperdickRenderer.initialize.call(this, mainNode);
        this._previousGridOffset = 0;
        this._gridNode = mainNode.querySelector(".grid");
        this._addHandler("setup", function (grid, player) {
            _this._playerPosition = 0;
            grid.forEach(function (column, columnIndex) {
                var columnNode = document.createElement("div");
                columnNode.classList.add("column");
                column.forEach(function (cell, cellIndex) {
                    var cellNode = document.createElement("div");
                    cellNode.classList.add("cell");
                    for (var modifierName in Cell.modifiers) {
                        if (cell.type & Cell.modifiers[modifierName]) {
                            cellNode.classList.add(modifierName);
                        }
                    }
                    var labelNode = document.createElement("span");
                    labelNode.classList.add("label");
                    labelNode.textContent = cell.label;
                    cellNode.appendChild(labelNode);
                    columnNode.appendChild(cellNode);
                    cell.data["node"] = cellNode;
                });
                column.data["node"] = columnNode;
                _this._gridNode.appendChild(columnNode);
            });
            _this.handle("resize", grid, player);
            // To prevent a glitchy-looking animation, show the player after CSS processing...
            setTimeout(function () {
                _this._playerNode.classList.add("visible");
            });
            // We also start handling resizes automatically
            window.addEventListener("resize", function () {
                _this.handle("resize", grid, player);
            });
        });
        this._addHandler("resize", function (grid, player) {
            // Wow. So work to get basic information. Very verbosity. Wow.
            var gameStyle = getComputedStyle(_this._gameNode);
            var width = document.documentElement.clientWidth -
                parseInt(gameStyle.marginLeft.replace(/px$/, "")) -
                parseInt(gameStyle.marginRight.replace(/px$/, ""));
            var height = document.documentElement.clientHeight -
                _this._statusNode.clientHeight -
                _this._instructionsNode.clientHeight -
                parseInt(gameStyle.marginTop.replace(/px$/, "")) -
                parseInt(gameStyle.marginBottom.replace(/px$/, ""));
            // Cell size should always be such that we don't create scrollbars
            if (width / height > grid.width / grid.height) {
                _this._cellSize = parseInt("" + height / grid.height);
            }
            else {
                _this._cellSize = parseInt("" + width / grid.width);
            }
            var adjustedWidth = _this._cellSize * grid.width;
            var adjustedHeight = _this._cellSize * grid.height;
            // Resize the game
            _this._gameNode.style.width = adjustedWidth + "px";
            _this._gameNode.style.height = adjustedHeight + "px";
            // Resize the grid
            _this._gridNode.style.width = adjustedWidth + _this._cellSize + "px";
            // Resize and relocate the player
            _this._playerNode.style.left =
                -parseInt("" + _this._cellSize * _this._playerPosition) + "px";
            _this._crosshairNode.style.left =
                (parseInt("" + _this._playerPosition) + player.x - 1) * _this._cellSize +
                    "px";
            _this._crosshairNode.style.top = (player.y - 1) * _this._cellSize + "px";
            _this._crosshairNode.style.width = _this._cellSize + "px";
            _this._crosshairNode.style.height = _this._cellSize + "px";
            _this._crosshairNode.style.borderWidth = _this._cellSize + "px";
            // Resize the cells
            grid.forEach(function (column, columnIndex) {
                var columnNode = column.data["node"];
                columnNode.style.height = grid.height * _this._cellSize + "px";
                columnNode.style.width = _this._cellSize + "px";
                columnNode.style.left = columnIndex * _this._cellSize + "px";
                column.forEach(function (cell, cellIndex) {
                    var cellNode = cell.data["node"];
                    cellNode.style.top = cellIndex * _this._cellSize + "px";
                    cellNode.style.width = _this._cellSize + "px";
                    cellNode.style.height = _this._cellSize + "px";
                    cellNode.querySelector(".label").style.fontSize =
                        parseInt("" + _this._cellSize * _this._fontSizeMultiplier) + "px";
                });
            });
        });
        this._addHandler("start", function () {
            _this._gameNode.classList.add("ongoing");
        });
        this._addHandler("run", function () {
            _this._gameNode.classList.remove("paused");
        });
        this._addHandler("pause", function () {
            _this._gameNode.classList.add("paused");
        });
        this._addHandler("cycle", function (grid) {
            grid.forEach(function (column, columnIndex) {
                var columnNode = column.data["node"];
                if (columnIndex === grid.length - 1) {
                    column.forEach(function (cell) {
                        var cellNode = cell.data["node"];
                        for (var modifierName in Cell.modifiers) {
                            if (cell.type & Cell.modifiers[modifierName]) {
                                cellNode.classList.add(modifierName);
                            }
                            else {
                                cellNode.classList.remove(modifierName);
                            }
                        }
                        cellNode.querySelector(".label").textContent = cell.label;
                    });
                }
                columnNode.style.left = columnIndex * _this._cellSize + "px";
            });
        });
        this._addHandler("scroll", function (offset, position) {
            _this._playerPosition = position;
            var currentGridOffset = parseInt("" + _this._cellSize * offset);
            if (_this._previousGridOffset !== currentGridOffset) {
                _this._gridNode.style.left = -currentGridOffset + "px";
                _this._playerNode.style.left =
                    -parseInt("" + _this._cellSize * position) + "px";
            }
            _this._previousGridOffset = currentGridOffset;
        });
        this._addHandler("move", function (player, cell) {
            // Relocate the player
            _this._crosshairNode.style.left =
                (parseInt("" + _this._playerPosition) + player.x - 1) * _this._cellSize +
                    "px";
            _this._crosshairNode.style.top = (player.y - 1) * _this._cellSize + "px";
        });
        this._addHandler("cell", function (cell) {
            var cellNode = cell.data["node"];
            for (var modifierName in Cell.modifiers) {
                if (cell.type & Cell.modifiers[modifierName]) {
                    cellNode.classList.add(modifierName);
                }
                else {
                    cellNode.classList.remove(modifierName);
                }
            }
        });
    };
    /**
     * CanvasRenderer: the shape of things to come (they've not yet come)
     */
    var CanvasTyperdickRenderer = Object.create(TyperdickRenderer);
    CanvasTyperdickRenderer.initialize = function (mainNode) {
        var _this = this;
        TyperdickRenderer.initialize.call(this, mainNode);
        this._addHandler("setup", function (grid, player) {
            _this._playerPosition = 0;
            _this._canvasNode = document.createElement("canvas");
            var gridNode = mainNode.querySelector(".grid");
            gridNode.style.right = "0";
            gridNode.appendChild(_this._canvasNode);
            _this._canvasContext = _this._canvasNode.getContext("2d");
            _this.handle("resize", grid, player);
            grid.forEach(function (column, columnIndex) {
                column.forEach(function (cell, cellIndex) {
                    for (var modifierName in Cell.modifiers) {
                        if (cell.type & Cell.modifiers[modifierName]) {
                        }
                    }
                    _this._canvasContext.fillText(cell.label, columnIndex * _this._cellSize, cellIndex * _this._cellSize);
                });
            });
            // To prevent a glitchy-looking animation, show the player after CSS processing...
            setTimeout(function () {
                _this._playerNode.classList.add("visible");
            });
            // We also start handling resizes automatically
            window.addEventListener("resize", function () {
                _this.handle("resize", grid, player);
            });
        });
        this._addHandler("resize", function (grid, player) {
            // Wow. So work to get basic information. Very verbosity. Wow.
            var gameStyle = getComputedStyle(_this._gameNode);
            var width = document.documentElement.clientWidth -
                parseInt(gameStyle.marginLeft.replace(/px$/, "")) -
                parseInt(gameStyle.marginRight.replace(/px$/, ""));
            var height = document.documentElement.clientHeight -
                _this._statusNode.clientHeight -
                _this._instructionsNode.clientHeight -
                parseInt(gameStyle.marginTop.replace(/px$/, "")) -
                parseInt(gameStyle.marginBottom.replace(/px$/, ""));
            // Cell size should always be such that we don't create scrollbars
            if (width / height > grid.width / grid.height) {
                _this._cellSize = parseInt("" + height / grid.height);
            }
            else {
                _this._cellSize = parseInt("" + width / grid.width);
            }
            var adjustedWidth = _this._cellSize * grid.width;
            var adjustedHeight = _this._cellSize * grid.height;
            // Resize the game
            _this._gameNode.style.width = adjustedWidth + "px";
            _this._gameNode.style.height = adjustedHeight + "px";
            _this._canvasNode.width = adjustedWidth;
            _this._canvasNode.height = adjustedHeight;
            _this._canvasNode.style.fontSize =
                parseInt("" + _this._cellSize * _this._fontSizeMultiplier) + "px";
            // Resize and relocate the player
            _this._playerNode.style.left =
                -parseInt("" + _this._cellSize * _this._playerPosition) + "px";
            _this._crosshairNode.style.left =
                (parseInt(_this._playerPosition) + player.x - 1) * _this._cellSize + "px";
            _this._crosshairNode.style.top = (player.y - 1) * _this._cellSize + "px";
            _this._crosshairNode.style.width = _this._cellSize + "px";
            _this._crosshairNode.style.height = _this._cellSize + "px";
            _this._crosshairNode.style.borderWidth = _this._cellSize + "px";
        });
        this._addHandler("cycle", function (grid) { });
        this._addHandler("scroll", function (offset, position) {
            _this._playerPosition = position;
            var currentGridOffset = parseInt("" + _this._cellSize * offset);
            if (_this._previousGridOffset !== currentGridOffset) {
                _this._playerNode.style.left =
                    -parseInt("" + _this._cellSize * position) + "px";
            }
            _this._previousGridOffset = currentGridOffset;
        });
        this._addHandler("move", function (player, cell) {
            // Relocate the player
            _this._crosshairNode.style.left =
                (parseInt(_this._playerPosition) + player.x - 1) * _this._cellSize + "px";
            _this._crosshairNode.style.top = (player.y - 1) * _this._cellSize + "px";
        });
        this._addHandler("cell", function (cell) {
            for (var modifierName in Cell.modifiers) {
                if (cell.type & Cell.modifiers[modifierName]) {
                    // TODO
                }
                else {
                    // TODO
                }
            }
        });
    };
})();
