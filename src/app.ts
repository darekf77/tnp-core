//#region imports
import { CommonModule } from '@angular/common';
import { NgModule, inject, Injectable } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { VERSION } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Taon, BaseContext } from 'taon/src';
import { Helpers } from 'tnp-core/src';

import { CLIENT_DEV_WEBSQL_APP_PORT, HOST_BACKEND_PORT } from './app.hosts';
//#endregion


console.log('hello world');
console.log('Your server will start on port ' + HOST_BACKEND_PORT);
const host = 'http://localhost:' + HOST_BACKEND_PORT;

const frontendHost =
  'http://localhost:' +
  (Helpers.isWebSQL ? CLIENT_DEV_WEBSQL_APP_PORT : CLIENT_DEV_WEBSQL_APP_PORT);

//#region tnp-core component
//#region @browser
@Component({
  selector: 'app-tnp-core',
  template: `hello from tnp-core<br />
    Angular version: {{ angularVersion }}<br />
    <br />
    users from backend
    <ul>
      <li *ngFor="let user of users$ | async">{{ user | json }}</li>
    </ul> `,
  styles: [
    `
      body {
        margin: 0px !important;
      }
    `,
  ],
})
export class TnpCoreComponent {
  angularVersion = VERSION.full;
  userApiService = inject(UserApiService);
  readonly users$: Observable<User[]> = this.userApiService.getAll();
}
//#endregion
//#endregion

//#region  tnp-core api service
//#region @browser
@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  userControlller = Taon.inject(() => MainContext.getClass(UserController));
  getAll() {
    return this.userControlller
      .getAll()
      .received.observable.pipe(map(r => r.body.json));
  }
}
//#endregion
//#endregion

//#region  tnp-core module
//#region @browser
@NgModule({
  exports: [TnpCoreComponent],
  imports: [CommonModule],
  declarations: [TnpCoreComponent],
})
export class TnpCoreModule {}
//#endregion
//#endregion

//#region  tnp-core entity
@Taon.Entity({ className: 'User' })
class User extends Taon.Base.AbstractEntity {
  //#region @websql
  @Taon.Orm.Column.String()
  //#endregion
  name?: string;
}
//#endregion

//#region  tnp-core controller
@Taon.Controller({ className: 'UserController' })
class UserController extends Taon.Base.CrudController<User> {
  entityClassResolveFn = () => User;
  //#region @websql
  async initExampleDbData(): Promise<void> {
    const superAdmin = new User();
    superAdmin.name = 'super-admin';
    await this.db.save(superAdmin);
  }
  //#endregion
}
//#endregion

//#region  tnp-core context
var MainContext = Taon.createContext(() => ({
  host,
  frontendHost,
  contextName: 'MainContext',
  contexts: { BaseContext },
  controllers: {
    UserController,
    // PUT FIREDEV CONTORLLERS HERE
  },
  entities: {
    User,
    // PUT FIREDEV ENTITIES HERE
  },
  database: true,
  // disabledRealtime: true,
}));
//#endregion

async function start() {
  await MainContext.initialize();

  if (Taon.isBrowser) {
    const users = (
      await MainContext.getClassInstance(UserController).getAll().received
    ).body?.json;
    console.log({
      'users from backend': users,
    });
  }
}

export default start;
