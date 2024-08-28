// // #region @notForNpm
// import { Taon } from 'taon/src';
// import { map, Observable, share, Subject, takeUntil, tap } from 'rxjs';
// const host = `http://localhost:3232`;

// //#region @browser
// import { NgModule, NgZone } from '@angular/core';
// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// //#endregion
// @Taon.Entity({ className: 'Task' })
// class Task extends Taon.Base.Entity {

//   //#region @websql

//   @Taon.Orm.Column.Generated()
//   //#endregion
//   id?: number;

//   //#region @websql

//   @Taon.Orm.Column.Custom('varchar')
//   //#endregion
//   name?: string;

//   static from(data: Omit<Task, 'id' | 'ctrl'>) {
//     return Object.assign(new Task(), data) as Task;
//   }
//   static ctrl: TaskController;
// }

// @Taon.Controller({ className: 'TaskController', entity: Task })
// class TaskController extends Taon.Base.Controller<Task> {
//   //#region @websql
//   async initExampleDbData() { // @ts-ignore
//     const db = await this.connection.getRepository(Task);
//     await db.save(Task.from({ name: 'my first tasks todo' }));
//     await db.save(Task.from({ name: 'my second tasks todo' }));
//     await db.save(Task.from({ name: 'find yt videos' }));
//     await db.save(Task.from({ name: 'find my twin' }));
//   }
//   //#endregion

//   @Taon.Http.GET()
//   count(): Taon.Response<number> {
//     //#region @websqlFunc
//     return async () => { // @ts-ignore
//       const db = await this.connection.getRepository(Task);
//       const [__, b] = await db.findAndCount();
//       return b;
//     }
//     //#endregion
//   }
// }

// //#region @browser
// @Component({
//   selector: 'app-tnp-core',
//   template: `
//     <ul *ngIf="tasks$" >
//       Tasks:
//       <li *ngFor="let task of (tasks$ | async)" > - {{ task.name }} </li>
//     </ul>
//     <div *ngIf="count$" >
//     task count from server: {{ (count$ | async) | json }}
//     </div>
//   `
// })
// export class TnpCoreComponent implements OnInit {
//   destroy$ = new Subject();
//   tasks$: Observable<Task[]>;
//   count$: Observable<number>;
//   normalTasks = [];

//   async ngOnInit() {
//     this.tasks$ = Task.ctrl.getAll().received.observable.pipe(
//       takeUntil(this.destroy$),
//       map(r => {
//         const tasks = r.body.json;
//         console.log({ tasks })
//         return tasks;
//       }),
//       share(),
//     );

//     this.count$ = Task.ctrl.count().received.observable.pipe(
//       takeUntil(this.destroy$),
//       map(r => {
//         const count = Number(r.body.text);
//         return count;
//       }),
//     );
//   }
//   ngOnDestroy(): void {
//     this.destroy$.next(void 0);
//     this.destroy$.unsubscribe();
//   }
// }

// @NgModule({
//   imports: [CommonModule],
//   exports: [TnpCoreComponent],
//   declarations: [TnpCoreComponent],
// })
// export class TnpCoreModule { }
// //#endregion

// async function start() {
//   const config = await Taon.init({
//     host,
//     controllers: [TaskController],
//     entities: [Task],
//     //#region @websql
//     config: {
//       type: 'better-sqlite3',
//       database: 'tmp-db1.sqlite',
//       // synchronize: true,
//       // dropSchema: true,
//       logging: false,
//     }
//     //#endregion
//   });

//   console.log(config);
// }

// export default start;
// //#endregion
