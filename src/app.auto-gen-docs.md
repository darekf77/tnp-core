App **tnp-core**

Description for tnp-core. Hello world!:


<details>
<summary>imports</summary>

```ts
import * as os from 'os'; // @backend

import { CommonModule } from '@angular/common'; // @browser
import { NgModule, inject, Injectable } from '@angular/core'; // @browser
import { Component, OnInit } from '@angular/core'; // @browser
import { VERSION } from '@angular/core'; // @browser
import Aura from '@primeng/themes/aura'; // @browser
import { MaterialCssVarsModule } from 'angular-material-css-vars'; // @browser
import { providePrimeNG } from 'primeng/config'; // @browser
import { Observable, map } from 'rxjs';
import { Taon, TaonBaseContext, TAON_CONTEXT } from 'taon/src';
import { UtilsOs } from 'tnp-core/src';

import { HOST_URL, FRONTEND_HOST_URL } from './app.hosts';
import { APP_ID } from './lib/build-info._auto-generated_';
```

</details>


<details>
<summary>tnp-core component</summary>

```ts
//#region @browser
@Component({
  selector: 'app-tnp-core',
  standalone: false,
  template: `hello from tnp-core<br />
    Angular version: {{ angularVersion }}<br />
    <br />
    users from backend
    <ul>
      <li *ngFor="let user of users$ | async">{{ user | json }}</li>
    </ul>
    hello world from backend: <strong>{{ hello$ | async }}</strong> `,
  styles: [
    `
      body {
        margin: 0px !important;
      }
    `,
  ],
})
export class TnpCoreComponent {
  angularVersion =
    VERSION.full +
    ` mode: ${UtilsOs.isRunningInWebSQL() ? ' (websql)' : '(normal)'}`;
  userApiService = inject(UserApiService);
  readonly users$: Observable<User[]> = this.userApiService.getAll();
  readonly hello$ = this.userApiService.userController
    .helloWorld()
    .received.observable.pipe(map(r => r.body.text));
}
//#endregion
```

</details>


<details>
<summary>tnp-core api service</summary>

```ts
//#region @browser
@Injectable({
  providedIn: 'root',
})
export class UserApiService extends Taon.Base.AngularService {
  userController = this.injectController(UserController);
  getAll(): Observable<User[]> {
    return this.userController
      .getAll()
      .received.observable.pipe(map(r => r.body.json));
  }
}
//#endregion
```

</details>


<details>
<summary>tnp-core module</summary>

```ts
//#region @browser
@NgModule({
  providers: [
    {
      provide: TAON_CONTEXT,
      useFactory: () => MainContext,
    },
    providePrimeNG({
      // inited ng prime - remove if not needed
      theme: {
        preset: Aura,
      },
    }),
  ],
  exports: [TnpCoreComponent],
  imports: [
    CommonModule,
    MaterialCssVarsModule.forRoot({
      // inited angular material - remove if not needed
      primary: '#4758b8',
      accent: '#fedfdd',
    }),
  ],
  declarations: [TnpCoreComponent],
})
export class TnpCoreModule {}
//#endregion
```

</details>


<details>
<summary>tnp-core entity</summary>

```ts
@Taon.Entity({ className: 'User' })
class User extends Taon.Base.AbstractEntity {
  //#region @websql
  @Taon.Orm.Column.String()
  //#endregion
  name?: string;
}
```

</details>


<details>
<summary>tnp-core controller</summary>

```ts
@Taon.Controller({ className: 'UserController' })
class UserController extends Taon.Base.CrudController<User> {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  entityClassResolveFn = () => User;

  @Taon.Http.GET()
  helloWorld(): Taon.Response<string> {
    //#region @websqlFunc
    return async (req, res) => 'hello world';
    //#endregion
  }

  @Taon.Http.GET()
  getOsPlatform(): Taon.Response<string> {
    //#region @websqlFunc
    return async (req, res) => {
      //#region @backend
      return os.platform(); // for normal nodejs backend return real value
      //#endregion
      return 'no-platform-inside-browser-and-websql-mode';
    };
    //#endregion
  }
}
```

</details>


<details>
<summary>tnp-core migration</summary>

```ts
//#region @websql
@Taon.Migration({
  className: 'UserMigration',
})
class UserMigration extends Taon.Base.Migration {
  userController = this.injectRepo(User);
  async up(): Promise<any> {
    const superAdmin = new User();
    superAdmin.name = 'super-admin';
    await this.userController.save(superAdmin);
  }
}
//#endregion
```

</details>


<details>
<summary>tnp-core context</summary>

```ts
var MainContext = Taon.createContext(() => ({
  host: HOST_URL,
  appId: APP_ID,
  frontendHost: FRONTEND_HOST_URL,
  contextName: 'MainContext',
  contexts: { TaonBaseContext },
  //#region @websql
  migrations: {
    UserMigration,
  },
  //#endregion
  controllers: {
    UserController,
  },
  entities: {
    User,
  },
  database: true,
  // disabledRealtime: true,
}));
```

</details>


<details>
<summary>@backend</summary>

```ts
  console.log(`Hello in NodeJs basdackend! os=${os.platform()}`);
```

</details>



