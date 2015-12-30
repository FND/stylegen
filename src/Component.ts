"use strict";

import * as path from 'path';
import * as fs from 'fs-extra';
import * as denodeify from 'denodeify';

var fsreaddir = denodeify(fs.readdir);

import {warn} from './Logger';
import {IRenderer} from './Renderer';
import {Partial} from './Partial';
import {View} from './View';
import {Node} from './Node';
import {Doc} from './Doc';

/** configuration structure for the component settings, aka. component.json */
export interface IComponentConfig {
  id?: string;
  partials?: Partial[];
  view?: View;
  path?: string;
  namespace?: string;
  label?: string;
  docs?: Doc[];
  tags?: string[];
  viewContext?: {};
}

/**
 * Components are the representation of the real asset components,
 * that are represented by a component.json file inside of an component folder.
 * A Component has a one-to-one relationship to a Node.
 */
export class Component {
  id: string;
  partials: Partial[];
  view: View;
  docs: Doc[];
  slug: string;
  tags: string[];
  htmlRenderer: IRenderer;

  /**
   * @param config - the parsed component.json file, enriched with current path and namespace.
   */
  constructor(public config:IComponentConfig, private node:Node) {
    this.id = this.config.id || path.basename(config.path);
    this.slug = `${this.config.namespace}-${this.id}`;
    this.id = `${this.config.namespace}.${this.id}`;
    this.tags = this.config.tags;
  }

  /**
   * a component may have several partials, that are component related view snippets,
   * that are reusable by other partials or view components.
   */
  private buildPartials():Promise<Component> {
    var partialPromises:Promise<Partial>[];

    if(!!this.config.partials) {

      /**
       * load all Partials
       */
      partialPromises = this.config.partials.map((partialName:string) => {
        var p = path.resolve(this.config.path, partialName);

        /** add partial loading promise to promise collection */
        return Partial.create(p, this.config.namespace).load();
      });

    /** when no partials are configured, look for _partial.hbs files in the current path */
    } else if(!this.config.partials) {
      // TODO: make _partial suffix configurable, along with the other references to it
      partialPromises = this.node.files.filter(x => new RegExp("^.*?_partial.hbs$").test(x)).map((partialName:string) => {
        var p = path.resolve(this.config.path, partialName);
        return Partial.create(p, this.config.namespace).load();
      });

    /** no partials configured, no problem.  */
    } else {
      this.partials = [];
      warn("WARN:", "Component.buildPartials", "Did not found any partials for Component", this.id);
      return Promise.resolve(this);
    }

    return Promise.all(partialPromises)
    .then((partials:Partial[]) => {
      this.partials = partials;
      return this;
    });
  }

  /**
   * at the moment a Component can have exactly one view,
   * that is available later as executable js function.
   *
   * A view is not reusable directly in other views,
   * to have a reusable snippet, register a Partial instead.
   */
  private buildView():Promise<Component> {
    var viewPath:string;
    if(!!this.config.view) {
      viewPath = path.resolve(this.config.path, this.config.view);

    /** no view configured, ok, lets look inside the current path for _view.hbs files */
    } else if(!this.config.view) {
      viewPath = this.node.files.find(x => new RegExp("^view.hbs$").test(x))

    /** no view found, no problem :) */
    } else {
      warn("WARN:", "Component.buildView", "Did not found a view for Component", this.id);
      return Promise.resolve(this);
    }

    return View.create(viewPath).load()
    .then((view) => {
      this.view = view;
      return this;
    });
  }

  /**
   */
  private buildDocs():Promise<Component> {
    if(!!this.config.docs) {
      /**
       * load all Docs
       */
      var docs = this.config.docs;
      var docPromises:Promise<Doc>[] = Object.keys(docs).map((doc:string) => {
        var p = path.resolve(this.config.path, docs[doc]);
        /** add partial loading promise to promise collection */
        return Doc.create(p, doc).load();
      });

      return Promise.all(docPromises)
      .then((loadedDocs:Doc[]) => {
        this.docs = loadedDocs;
        return this;
      });

    /** no partials configured, no problem.  */
    } else {
      this.docs = [];

      if (!!this.config.namespace && this.config.namespace != 'sg') {
        warn("WARN:", "Component.buildDocs", "Did not found any docs for Component", this.id);
      }

      return Promise.resolve(this);
    }
  }

  /**
   * building a component means to retrieve the flesh and bones of the component,
   * that are described in its config
   *
   * --> Its Partials, its View, and later all other related stuff.
   */
  public build():Promise<Component> {
    /** resolve the component partials at first */
    return this.buildPartials()
    /** after that lets read and build its view */
    .then(() => this.buildView())
    .then(() => this.buildDocs());
  }
}
