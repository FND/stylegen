"use strict";

import * as fs from 'fs';
import * as denodeify from 'denodeify';

import {IRenderer} from './Renderer';

var fsreadfile = denodeify(fs.readFile);

export interface ICompilableContent {
  raw: string;
  name: string;
  compiled: string;
  renderer: IRenderer;

  load():Promise<ICompilableContent>;
}

export class CompilableContent implements ICompilableContent {
  public static renderer: IRenderer;

  public renderer: IRenderer;
  public raw: string;
  public compiled: string;

  static setRenderer(renderer: IRenderer) {
    this.renderer = renderer;
  }
  constructor(public filePath: string, public name: string) {}

  load():Promise<ICompilableContent> {
    return fsreadfile(this.filePath.toString())
    .then((buffer) => {
      var content:string = buffer.toString();
      this.raw = content;
      return this;
    });
  }

  render():string {
    return this.renderer.render(this.raw);
  }
}
