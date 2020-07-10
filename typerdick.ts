/*
 * © new Date().getFullYear() Milosz Kosmider and Adam Bielinski
 * License: http://www.dbad-license.org/
 */
(function () {
  const options: OptionsType = {
    minimumSpeed: 0.5, // Cells per second
    acceleration: 0.05, // Cells per second per second
    speedLossOnSlow: 0.2, // Cells per second
    gridWidth: 30, // Cells
    gridHeight: 20, // Cells
    initialColumnCount: 5, // Cells (columns)
    probabilities: {
      // [0, 1]
      score: 1 / 10,
      slow: 1 / 120,
      block: 1 / 60,
    },
  };
  type OptionsType = {
    minimumSpeed: number;
    acceleration: number;
    speedLossOnSlow: number;
    gridWidth: number;
    gridHeight: number;
    initialColumnCount: number;
    probabilities: {
      score: number;
      slow: number;
      block: number;
    };
  };

  Object.freeze(options.probabilities);
  Object.freeze(options);

  document.addEventListener("DOMContentLoaded", function () {
    // start the renderer
    //  var renderer = CanvasTyperdickRenderer.new(document.querySelector('.main'));
    const renderer = HtmlTyperdickRenderer.new(document.querySelector(".main"));

    // start the game
    const game = Game.new(options, renderer);
  });

  /**
   * Base: the base object, without which I never leave home
   */

  const Base: BaseType = Object.create([]);
  interface BaseType extends Array<any> {
    new: (...args: any) => this;
    initialize(...args: any): void;
  }

  /** creates and returns a Base after initializing it */
  Base.new = function (): BaseType {
    const clone = Object.create(this);
    clone.initialize.apply(clone, arguments);
    return clone;
  };

  Base.initialize = function (): void {};

  /**
   * Timer: keeps the bullshit synchronized
   */

  const Timer: TimerType = Object.create(Base);
  type TimerType = BaseType & {
    initialize(): void;
    /**  */
    _tickActions: TickActionFn[];
    _isPaused: boolean;
    reset(): void;
    _savedElapsedTime: number;
    _previousTime: number; // * is this "startTime"?
    getTotalElapsedTime(): number;
    _tick(): void;
    _relativeElapsedTime: number;
    _lastTickElapsedTime: number;
    run(): void;
    pause(): void;
    isPaused(): boolean;
    addTickAction(tickAction: TickActionFn): void;
  };
  type TickActionFn = (
    relativeElapsedTime: number,
    totalElapsedTime: number
  ) => void;

  Timer.initialize = function (): void {
    this._tickActions = [];
    this._isPaused = true;
    this.reset();
  };

  Timer.getTotalElapsedTime = function (): number {
    return !this._isPaused
      ? // total time elapsed = now - previous
        Date.now() - this._previousTime
      : this._savedElapsedTime;
  };

  /** animation loop */
  Timer._tick = function () {
    const tick = () => {
      if (this._isPaused) {
        return;
      } else {
        requestAnimationFrame(tick);

        const totalElapsedTime = this.getTotalElapsedTime();

        // (relative) = (total) - (last tick)
        this._relativeElapsedTime =
          totalElapsedTime - this._lastTickElapsedTime;

        // * perform all tick actions e.g. ...?
        this._tickActions.forEach((tickAction) => {
          tickAction(this._relativeElapsedTime, totalElapsedTime);
        });

        this._lastTickElapsedTime = totalElapsedTime;
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

  Timer.isPaused = function (): boolean {
    return this._isPaused;
  };

  Timer.addTickAction = function (tickAction) {
    this._tickActions.push(tickAction);
  };

  /**
   * Player: avatar of the frail human mind
   */
  const Player: PlayerType = Object.create(Base);
  type PlayerType = BaseType & {
    initialize(x: number, y: number): void;
    x: number;
    y: number;
  };

  Player.initialize = function (x: number, y: number) {
    this.x = x;
    this.y = y;
  };

  /**
   * Cell: the smallest unit of bullshit
   */

  const Cell = Object.create(Base);
  type CellType = BaseType & {
    type: number;
    label: string;
    data: {};
    modifiers: OptionsType["probabilities"];
  };

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

  const Column: ColumnType = Object.create(Base);
  type ColumnType = BaseType & {
    data: {};
  };

  Column.initialize = function () {
    this.data = {};
  };

  /**
   * Grid: the bullshit organizer
   */

  const Grid: GridType = Object.create(Base);
  type GridType = BaseType & {
    initialize(
      width: number,
      height: number,
      probabilities: OptionsType["probabilities"]
    ): void;
    _probabilities: OptionsType["probabilities"];
    _bufferedWidth: number;
    width: number;
    height: number;
    getCell(x: number, y: number): CellType | undefined;
    cycle(): void;
  };

  Grid.initialize = function (
    width: number,
    height: number,
    probabilities: OptionsType["probabilities"]
  ) {
    this.width = width;
    this.height = height;

    this._bufferedWidth = this.width + 1; // plus 1 for the hidden column
    this._probabilities = probabilities;
    // make {_bufferedWidth} new columns,
    for (let x = 0; x < this._bufferedWidth; ++x) {
      const column = Column.new();
      // and push {height} many cells into each
      for (let y = 0; y < this.height; ++y) {
        column.push(Cell.new());
      }
      this.push(column);
    }
  };

  Grid.getCell = function (x: number, y: number): CellType | undefined {
    var column = this[x];
    if (column === undefined) {
      return undefined;
    }
    return this[x][y];
  };

  Grid.cycle = function () {
    var column = this[0];
    for (var y = 0; y < column.length; ++y) {
      const cell = column[y];

      // A string containing all the letters that can't be used for the current cell
      const clashingCellLabels: string = this[this.length - 2]
        .slice(Math.max(y - 2, 0), y + 3)
        .concat(
          // One column back, two cells above and below
          this[this.length - 1].slice(Math.max(y - 2, 0), y + 3)
        )
        .concat(
          // Two columns back, two cells above and below
          // Current column, two cells above
          column.slice(Math.max(y - 2, 0), y)
        )
        .reduce(function (labelString, cell) {
          return labelString + cell.label.toUpperCase();
        }, "");

      // A string containing all the valid letters
      var possibleCellLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".replace(
        new RegExp("[" + clashingCellLabels + "]", "g"),
        ""
      );

      // The single valid chosen letter
      var currentCellLabel =
        possibleCellLabels[
          parseInt(`${Math.random() * possibleCellLabels.length}`)
        ];

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

  Grid.toString = function (): string {
    // rows of the grid, e.g. AOUQ-EOO|SOBAWNGUI|WJANU-HELLO
    const rows = [...new Array()].map((_) => "");

    // for each grid?
    this.forEach((column, x) => {
      // for each column
      column.forEach((cell, y) => {
        const isEndOfRow = x === this.width;
        // add the cell to the column
        rows[y] = rows[y] + (isEndOfRow ? "|" : "") + (cell.label || "-");
      });
    });

    return rows.join("\n");
  };

  /**
   * Game: that which gives the bullshit meaning
   */

  const Game: GameType = Object.create(Base);
  type GameType = BaseType & {
    new: (options: OptionsType, renderer: RendererType) => GameType;
    _renderer: RendererType;
    _minimumSpeed: number;
    _acceleration: number;
    _speedLossOnSlow: number;
    _speed: number;
    _offset: number;
    _position: number;
    _score: number;
    _started: boolean;
    _over: boolean;
    _timer: TimerType;
    _player: PlayerType;
    _grid: GridType;
    lose(): void;
    run(): void;
    pause(): void;
  };

  Game.initialize = function (options, renderer) {
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
    this._player = Player.new(
      options.gridWidth - options.initialColumnCount + 2,
      parseInt(`${options.gridHeight / 2}`)
    );

    // Make a grid
    this._grid = Grid.new(
      options.gridWidth,
      options.gridHeight,
      options.probabilities
    );

    // Buffer up some columns so the player isn't just floating in nothingness
    for (let i = 0; i < options.initialColumnCount; ++i) {
      /* let column =  */ this._grid.cycle();
    }

    // Clear some room around the player. The player can't be getting points right away. Jesus.
    const { x, y } = this._player;
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
    this._timer.addTickAction((relativeElapsedTime, totalElapsedTime) => {
      var relativeElapsedTimeInSeconds = relativeElapsedTime / 1000;
      this._offset += this._speed * relativeElapsedTimeInSeconds;
      this._position += this._speed * relativeElapsedTimeInSeconds;

      while (this._offset >= 1) {
        this._offset -= 1;
        this._grid.cycle();
        this._renderer.handle("cycle", this._grid);
        this._player.x -= 1;
        if (this._player.x < 0) {
          this.lose();
        }
      }

      this._renderer.handle("scroll", this._offset, this._position);
      this._renderer.handle("time", totalElapsedTime / 1000);
      this._renderer.handle("speed", this._speed);

      this._speed += this._acceleration * relativeElapsedTimeInSeconds;
    });

    /*
     * Input handling
     */
    // TODO: consider whether or not this should be in another module

    // Handle user input
    window.addEventListener("keydown", (event) => {
      //  backspace          and tab  are nuisances
      if (event.which === 8 || event.which === 9) {
        event.preventDefault();
        return;
      }

      //       game over  or  modifier key was pressed                         or  not a letter
      else if (
        this._over ||
        event.shiftKey ||
        event.ctrlKey ||
        event.altKey ||
        event.which < 65 ||
        event.which > 91
      ) {
        return;
      }
      event.preventDefault();

      const label = String.fromCharCode(event.which);

      let { x, y } = this._player;
      let targetCell = null as null | CellType;

      // Find the right cell among the neighbors
      [
        this._grid.getCell(x - 1, y - 1),
        this._grid.getCell(x + 0, y - 1),
        this._grid.getCell(x + 1, y - 1),
        this._grid.getCell(x - 1, y + 0), // <-- you are here
        ,
        this._grid.getCell(x + 1, y + 0),
        this._grid.getCell(x - 1, y + 1),
        this._grid.getCell(x + 0, y + 1),
        this._grid.getCell(x + 1, y + 1),
      ].forEach((cell, index) => {
        if (cell !== undefined && cell.label === label) {
          targetCell = cell;
          x = this._player.x + (index % 3) - 1;
          y = this._player.y + parseInt(`${index / 3}`) - 1;
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
        this._speed = Math.max(
          this._minimumSpeed,
          this._speed - this._speedLossOnSlow
        );
        targetCell.type &= ~Cell.modifiers.slow;
      }

      // A score cell will... well... give you points! Hehe!
      if (targetCell.type & Cell.modifiers.score) {
        this._score += 1;
        targetCell.type &= ~Cell.modifiers.score;
        this._renderer.handle("score", this._score);
      }

      this._renderer.handle("cell", targetCell);

      this._player.x = x;
      this._player.y = y;
      this._renderer.handle("move", this._player, targetCell);

      if (this._player.x < 0) {
        this.lose();
      }

      if (!this._started) {
        this.run();
        this._started = true;
        this._renderer.handle("start");
      }
    });

    // Handle window focussing and blurring
    window.addEventListener("focus", () => {
      if (this._started) {
        this.run();
      }
    });

    window.addEventListener("blur", () => {
      if (this._started) {
        this.pause();
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
    this._renderer.handle(
      "lose",
      this._score,
      this._speed,
      this._timer.getTotalElapsedTime()
    );
  };

  /**
   * Renderer: that which allows frail human minds to perceive and interact with the bullshit
   */

  const Renderer: RendererType = Object.create(Base);
  type RendererType = BaseType & {
    handle(action: string, ...args: any[]): void;
    _handlers: { [eventName: string]: EventHandlerType[] }; // ? is this more like "handlerses" or "handlerLists"?
    _addHandler(eventName: string, handler: EventHandlerType): void;
  };
  type EventHandlerType = (...args: any[]) => void;

  Renderer.initialize = function () {
    this._handlers = {};
  };

  Renderer.handle = function (eventName, ...args) {
    const eventHandlersList = this._handlers[eventName];
    if (eventHandlersList !== undefined) {
      eventHandlersList.forEach((handler) => {
        handler.apply(this, args);
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

  const TyperdickRenderer: TyperdickRendererType = Object.create(Renderer);
  type TyperdickRendererType = RendererType & {
    initialize(mainNode: HTMLElement): void;
    _fontSizeMultiplier: number;
    _gameNode: HTMLElement;
    _statusNode: HTMLElement;
    _instructionsNode: HTMLElement;
    _playerNode: HTMLElement;
    _crosshairNode: HTMLElement;
    _loseOverlayNode: HTMLElement;
  };

  TyperdickRenderer.initialize = function (mainNode: HTMLElement) {
    Renderer.initialize.call(this);

    this._fontSizeMultiplier = 0.85;
    this._gameNode = mainNode.querySelector(".game") as HTMLElement;
    this._statusNode = mainNode.querySelector(".status") as HTMLElement;
    this._instructionsNode = mainNode.querySelector(
      ".instructions"
    ) as HTMLElement;
    this._playerNode = mainNode.querySelector(".player") as HTMLElement;
    this._crosshairNode = mainNode.querySelector(".crosshair") as HTMLElement;
    this._loseOverlayNode = mainNode.querySelector(
      ".lose.overlay"
    ) as HTMLElement;

    this._addHandler("lose", (score, speed, time) => {
      (this._loseOverlayNode.querySelector(
        ".tweet"
      ) as HTMLElement).setAttribute(
        "href",
        `https://twitter.com/intent/tweet?${[
          [
            "text",
            "I only scored " +
              score +
              " points in Typerdick: the dickishly hard typing game",
          ],
          //      ['hashtags', 'typerdick'                                                                      ] ,
          ["url", "http://typerdick.com"],
        ]
          .map(
            (item) =>
              `${encodeURIComponent(item[0])}=${encodeURIComponent(item[1])}`
          )
          .join("&")}`
      );
      this._loseOverlayNode.classList.add("visible");
    });

    this._addHandler("score", (value) => {
      (this._statusNode.querySelector(
        ".score.field"
      ) as HTMLElement).textContent = `${value}`;
    });

    this._addHandler("speed", (value) => {
      (this._statusNode.querySelector(
        ".speed.field"
      ) as HTMLElement).textContent = Number(value).toFixed(2);
    });

    this._addHandler("time", (value) => {
      (this._statusNode.querySelector(
        ".time.field"
      ) as HTMLElement).textContent = Number(value).toFixed(1);
    });
  };

  /**
   * HTMLRenderer: for browsers that don't support canvas
   */

  const HtmlTyperdickRenderer: HtmlTyperdickRendererType = Object.create(
    TyperdickRenderer
  );
  type HtmlTyperdickRendererType = TyperdickRendererType & {
    _previousGridOffset: number;
    _gridNode: HTMLElement;
    _cellSize: number;
    _playerPosition: number;
  };

  HtmlTyperdickRenderer.initialize = function (mainNode) {
    TyperdickRenderer.initialize.call(this, mainNode);

    this._previousGridOffset = 0;

    this._gridNode = mainNode.querySelector(".grid");

    this._addHandler("setup", (grid, player) => {
      this._playerPosition = 0;

      grid.forEach((column, columnIndex) => {
        var columnNode = document.createElement("div");
        columnNode.classList.add("column");
        column.forEach((cell, cellIndex) => {
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
        this._gridNode.appendChild(columnNode);
      });

      this.handle("resize", grid, player);

      // To prevent a glitchy-looking animation, show the player after CSS processing...
      setTimeout(() => {
        this._playerNode.classList.add("visible");
      });

      // We also start handling resizes automatically
      window.addEventListener("resize", () => {
        this.handle("resize", grid, player);
      });
    });

    this._addHandler("resize", (grid, player) => {
      // Wow. So work to get basic information. Very verbosity. Wow.
      const gameStyle = getComputedStyle(this._gameNode);
      const width =
        document.documentElement.clientWidth -
        parseInt(gameStyle.marginLeft.replace(/px$/, "")) -
        parseInt(gameStyle.marginRight.replace(/px$/, ""));
      const height =
        document.documentElement.clientHeight -
        this._statusNode.clientHeight -
        this._instructionsNode.clientHeight -
        parseInt(gameStyle.marginTop.replace(/px$/, "")) -
        parseInt(gameStyle.marginBottom.replace(/px$/, ""));

      // Cell size should always be such that we don't create scrollbars
      if (width / height > grid.width / grid.height) {
        this._cellSize = parseInt(`${height / grid.height}`);
      } else {
        this._cellSize = parseInt(`${width / grid.width}`);
      }

      const adjustedWidth = this._cellSize * grid.width;
      const adjustedHeight = this._cellSize * grid.height;

      // Resize the game
      this._gameNode.style.width = adjustedWidth + "px";
      this._gameNode.style.height = adjustedHeight + "px";

      // Resize the grid
      this._gridNode.style.width = adjustedWidth + this._cellSize + "px";

      // Resize and relocate the player
      this._playerNode.style.left =
        -parseInt(`${this._cellSize * this._playerPosition}`) + "px";
      this._crosshairNode.style.left =
        (parseInt(`${this._playerPosition}`) + player.x - 1) * this._cellSize +
        "px";
      this._crosshairNode.style.top = (player.y - 1) * this._cellSize + "px";
      this._crosshairNode.style.width = this._cellSize + "px";
      this._crosshairNode.style.height = this._cellSize + "px";
      this._crosshairNode.style.borderWidth = this._cellSize + "px";

      // Resize the cells
      grid.forEach((column, columnIndex) => {
        const columnNode = column.data["node"];
        columnNode.style.height = grid.height * this._cellSize + "px";
        columnNode.style.width = this._cellSize + "px";
        columnNode.style.left = columnIndex * this._cellSize + "px";
        column.forEach((cell, cellIndex) => {
          const cellNode = cell.data["node"];
          cellNode.style.top = cellIndex * this._cellSize + "px";
          cellNode.style.width = this._cellSize + "px";
          cellNode.style.height = this._cellSize + "px";
          cellNode.querySelector(".label").style.fontSize =
            parseInt(`${this._cellSize * this._fontSizeMultiplier}`) + "px";
        });
      });
    });

    this._addHandler("start", () => {
      this._gameNode.classList.add("ongoing");
    });

    this._addHandler("run", () => {
      this._gameNode.classList.remove("paused");
    });

    this._addHandler("pause", () => {
      this._gameNode.classList.add("paused");
    });

    this._addHandler("cycle", (grid) => {
      grid.forEach((column, columnIndex) => {
        const columnNode = column.data["node"];
        if (columnIndex === grid.length - 1) {
          column.forEach((cell) => {
            const cellNode = cell.data["node"];
            for (let modifierName in Cell.modifiers) {
              if (cell.type & Cell.modifiers[modifierName]) {
                cellNode.classList.add(modifierName);
              } else {
                cellNode.classList.remove(modifierName);
              }
            }
            cellNode.querySelector(".label").textContent = cell.label;
          });
        }
        columnNode.style.left = columnIndex * this._cellSize + "px";
      });
    });

    this._addHandler("scroll", (offset, position) => {
      this._playerPosition = position;
      const currentGridOffset = parseInt(`${this._cellSize * offset}`);
      if (this._previousGridOffset !== currentGridOffset) {
        this._gridNode.style.left = -currentGridOffset + "px";
        this._playerNode.style.left =
          -parseInt(`${this._cellSize * position}`) + "px";
      }
      this._previousGridOffset = currentGridOffset;
    });

    this._addHandler("move", (player, cell) => {
      // Relocate the player
      this._crosshairNode.style.left =
        (parseInt(`${this._playerPosition}`) + player.x - 1) * this._cellSize +
        "px";
      this._crosshairNode.style.top = (player.y - 1) * this._cellSize + "px";
    });

    this._addHandler("cell", (cell) => {
      const cellNode = cell.data["node"];
      for (let modifierName in Cell.modifiers) {
        if (cell.type & Cell.modifiers[modifierName]) {
          cellNode.classList.add(modifierName);
        } else {
          cellNode.classList.remove(modifierName);
        }
      }
    });
  };

  /**
   * CanvasRenderer: the shape of things to come (they've not yet come)
   */

  const CanvasTyperdickRenderer: CanvasTyperdickRendererType = Object.create(
    TyperdickRenderer
  );
  type CanvasTyperdickRendererType = any; // TODO

  CanvasTyperdickRenderer.initialize = function (mainNode) {
    TyperdickRenderer.initialize.call(this, mainNode);

    this._addHandler("setup", (grid, player) => {
      this._playerPosition = 0;
      this._canvasNode = document.createElement("canvas");
      const gridNode = mainNode.querySelector(".grid");
      gridNode.style.right = "0";
      gridNode.appendChild(this._canvasNode);

      this._canvasContext = this._canvasNode.getContext("2d");

      this.handle("resize", grid, player);

      grid.forEach((column, columnIndex) => {
        column.forEach((cell, cellIndex) => {
          for (let modifierName in Cell.modifiers) {
            if (cell.type & Cell.modifiers[modifierName]) {
            }
          }
          this._canvasContext.fillText(
            cell.label,
            columnIndex * this._cellSize,
            cellIndex * this._cellSize
          );
        });
      });

      // To prevent a glitchy-looking animation, show the player after CSS processing...
      setTimeout(() => {
        this._playerNode.classList.add("visible");
      });

      // We also start handling resizes automatically
      window.addEventListener("resize", () => {
        this.handle("resize", grid, player);
      });
    });

    this._addHandler("resize", (grid, player) => {
      // Wow. So work to get basic information. Very verbosity. Wow.
      const gameStyle = getComputedStyle(this._gameNode);
      const width =
        document.documentElement.clientWidth -
        parseInt(gameStyle.marginLeft.replace(/px$/, "")) -
        parseInt(gameStyle.marginRight.replace(/px$/, ""));
      const height =
        document.documentElement.clientHeight -
        this._statusNode.clientHeight -
        this._instructionsNode.clientHeight -
        parseInt(gameStyle.marginTop.replace(/px$/, "")) -
        parseInt(gameStyle.marginBottom.replace(/px$/, ""));

      // Cell size should always be such that we don't create scrollbars
      if (width / height > grid.width / grid.height) {
        this._cellSize = parseInt(`${height / grid.height}`);
      } else {
        this._cellSize = parseInt(`${width / grid.width}`);
      }

      const adjustedWidth = this._cellSize * grid.width;
      const adjustedHeight = this._cellSize * grid.height;

      // Resize the game
      this._gameNode.style.width = adjustedWidth + "px";
      this._gameNode.style.height = adjustedHeight + "px";

      this._canvasNode.width = adjustedWidth;
      this._canvasNode.height = adjustedHeight;

      this._canvasNode.style.fontSize =
        parseInt(`${this._cellSize * this._fontSizeMultiplier}`) + "px";

      // Resize and relocate the player
      this._playerNode.style.left =
        -parseInt(`${this._cellSize * this._playerPosition}`) + "px";
      this._crosshairNode.style.left =
        (parseInt(this._playerPosition) + player.x - 1) * this._cellSize + "px";
      this._crosshairNode.style.top = (player.y - 1) * this._cellSize + "px";
      this._crosshairNode.style.width = this._cellSize + "px";
      this._crosshairNode.style.height = this._cellSize + "px";
      this._crosshairNode.style.borderWidth = this._cellSize + "px";
    });

    this._addHandler("cycle", (grid) => {});

    this._addHandler("scroll", (offset, position) => {
      this._playerPosition = position;
      const currentGridOffset = parseInt(`${this._cellSize * offset}`);
      if (this._previousGridOffset !== currentGridOffset) {
        this._playerNode.style.left =
          -parseInt(`${this._cellSize * position}`) + "px";
      }
      this._previousGridOffset = currentGridOffset;
    });

    this._addHandler("move", (player, cell) => {
      // Relocate the player
      this._crosshairNode.style.left =
        (parseInt(this._playerPosition) + player.x - 1) * this._cellSize + "px";
      this._crosshairNode.style.top = (player.y - 1) * this._cellSize + "px";
    });

    this._addHandler("cell", (cell) => {
      for (let modifierName in Cell.modifiers) {
        if (cell.type & Cell.modifiers[modifierName]) {
          // TODO
        } else {
          // TODO
        }
      }
    });
  };
})();
