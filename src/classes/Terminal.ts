import { createElement } from "react";
import { TerminalOutput } from "react-terminal-ui";
import { System } from "./System";

export interface TerminalEvents {
  input: (input: string) => void;
  render: () => void;
}

export class Terminal {
  public readonly history: TerminalOutput[] = [];
  public prompt: string = ">";
  public readonly system: System;
  private ignoreNextN = 0;

  private listeners: Map<keyof TerminalEvents, Function[]> = new Map();

  public constructor(system: System) {
		this.system = system;
  }

  public on<K extends keyof TerminalEvents>(
    event: K,
    callback: TerminalEvents[K]
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const callbacks = this.listeners.get(event);
    if (!callbacks) return; // This should never happen (but TS doesn't know that
    return callbacks.push(callback);
  }

  public off<K extends keyof TerminalEvents>(
    event: K,
    callback: TerminalEvents[K]
  ) {
    if (!this.listeners.has(event)) {
      return;
    }

    const callbacks = this.listeners.get(event);
    if (!callbacks) return; // This should never happen (but TS doesn't know that
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  public once<K extends keyof TerminalEvents>(
    event: K,
    callback: TerminalEvents[K]
  ) {
    const onceCallback = (...args: any[]) => {
      this.off(event, onceCallback);
      (callback as any)(...(args as any[]));
    };
    this.on(event, onceCallback);
  }

  public emit<K extends keyof TerminalEvents>(event: K, ...args: any[]) {
    if (!this.listeners.has(event)) {
      return;
    }

    const callbacks = this.listeners.get(event);
    if (!callbacks) return; // This should never happen (but TS doesn't know that
    callbacks.forEach((callback) => {
      callback(...args);
    });
  }

  public basic(message: string, withPrompt = true) {
    this.pushColored("white", message, withPrompt);
  }

  public info(message: string, withPrompt = true) {
    this.pushColored("teal", message, withPrompt);
  }

  public error(message: string, withPrompt = true) {
    this.pushColored("red", message, withPrompt);
  }

  public success(message: string, withPrompt = true) {
    this.pushColored("green", message, withPrompt);
  }

  public pushStyled(
    style: React.CSSProperties,
    message: string,
    withPrompt = true
  ) {
    this.pushHistory(
			createElement("span", { style }, withPrompt ? createElement('span', {style: {color: '#a2a2a2'}}, this.prompt + ' ') : undefined,  message) as any,
      withPrompt
    );
  }

  public pushColored(color: string, message: string, withPrompt = true) {
    this.pushStyled({ color }, message, withPrompt);
  }

  public pushHistory(
    value: string | React.ComponentElement<any, any>,
    withPrompt: boolean = true
  ) {
    const component =
      typeof value === "string"
        ? createElement(
            "span",
            undefined,
            withPrompt ? `${this.prompt} ${value}` : value
          )
        : value;
    this.history.push(component);
    this.emit("render");
  }

  public ignoreNext(n: number = 1) {
    this.ignoreNextN += n;
  }

  public shouldIgnore() {
    if (this.ignoreNextN > 0) {
      this.ignoreNextN--;
      return true;
    }
    return false;
  }

  public ask(question: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.pushHistory(
        createElement(
          "span",
          { style: { color: "teal" } },
          "? ",
          createElement("span", { style: { color: "white" } }, question)
        ) as any,
        false
      );
      this.ignoreNext();
      this.once("input", (input: string) => {
        this.info("  " + input);
        resolve(input);
      });
    });
	}
	
	public clear() {
		this.history.length = 0;
		this.emit("render");
	}

  public updatePrompt() {
		this.prompt = this.system.user.name + "@" + this.system.name + "$";
  }

  public handleInput(input: string) {
    this.emit("input", input);
  }
}