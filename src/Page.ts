"use strict";

import * as path from 'path';
import {Doc} from './Doc';
import {MarkdownRenderer} from './MarkdownRenderer';
import {Styleguide} from './Styleguide';
import {IRenderer} from './Renderer';

export interface IPageConfig {
  label?: string;
  type?: string;
  content?: string;
  styleguide?: Styleguide;
  mdRenderer?: IRenderer;
}

export class Page {
  target: string;
  content: string;
  parent: Page;
  children: Page[];
  mdRenderer: IRenderer;

  constructor(private config: IPageConfig, parent?: Page) {
    /** TODO: rotating demeter in his grave, so at least encapsulate the access to the engine */
    this.mdRenderer = this.config.mdRenderer;
  }

  resolveChildren():Promise<Page> {
    return new Promise((resolve) => resolve(this));
  }

  buildContent():Promise<Page> {
      var contentPromise:Promise<any>;

      switch(this.config.type) {
        case "md":
          contentPromise = new Doc(path.resolve(this.config.content), this.config.label).load()
          .then((doc: Doc) => {
            return this.mdRenderer.render(doc);
          });
          break;
        default:
          contentPromise = new Promise((resolve) => resolve(this));
        // case "tags":
        //   this.content = "";

      }

      return contentPromise
      .then((content: string) => {
        this.content = content;
        return this
      });
  }

  build():Promise<Page> {
    return this.resolveChildren()
    .then((page) => this.buildContent())
    .then(() => {return this; });
  }
}
