import { TaonBaseClass } from 'taon/src';

import { UtilsProjects } from './utils-projects';
import { isObject } from 'lodash-es';

describe('Utils Projects.sortGroupOfProject', () => {

  //#region example data
  class Proj implements UtilsProjects.OrderAbleProject {
    static from(obj: Partial<Proj>) {
      const proj = new Proj();
      Object.assign(proj, obj);
      return proj;
    }

    name: string;
    location: string;
    port: number;
    dependencies: string[];
  }

  const projects: Proj[] = [
    Proj.from({
      name: 'not-related',
      location: '/not-related',
      port: 12,
      dependencies: [],
    }),

    Proj.from({
      name: 'core',
      location: '/core',
      port: 1,
      dependencies: [],
    }),
    Proj.from({
      name: 'ui',
      location: '/ui',
      port: 2,
      dependencies: ['core'],
    }),
    Proj.from({
      name: 'app',
      location: '/app',
      port: 3,
      dependencies: ['ui'],
    }),
  ];
  //#endregion

  //#region should sort projects in proper dependency order
  it('should sort', () => {
    const sorted = UtilsProjects.sortGroupOfProject<Proj>({
      projects,
      resoveDepsArray: proj => proj.dependencies || [],
      projNameToCompare: proj => proj.name,
    }).map(c => c.name);

    expect(sorted).toEqual(['not-related', 'core', 'ui', 'app']);
  });
  //#endregion

  //#region should get deps only for core
  it('should get deps only for core', () => {
    const sorted = UtilsProjects.sortGroupOfProject<Proj>({
      projects,
      resoveDepsArray: proj => proj.dependencies || [],
      projNameToCompare: proj => proj.name,
      onlyDepsForProject: 'core',
    }).map(c => c.name);

    expect(sorted).toEqual(['core']);
  });
  //#endregion

  //#region should get deps only for ui
  it('should get deps only for ui', () => {
    const sorted = UtilsProjects.sortGroupOfProject<Proj>({
      projects,
      resoveDepsArray: proj => proj.dependencies || [],
      projNameToCompare: proj => proj.name,
      onlyDepsForProject: 'ui',
    }).map(c => c.name);

    expect(sorted).toEqual(['ui', 'core']);
  });
  //#endregion

  //#region should get deps only for app
  it('should get deps only for app', () => {
    const sorted = UtilsProjects.sortGroupOfProject<Proj>({
      projects,
      resoveDepsArray: proj => proj.dependencies || [],
      projNameToCompare: proj => proj.name,
      onlyDepsForProject: 'app',
    }).map(c => c.name);

    expect(sorted).toEqual(['app', 'ui', 'core']);
  });
  //#endregion

  //#region should get deps only for not-related
  it('should get deps only for not-related', () => {
    const sorted = UtilsProjects.sortGroupOfProject<Proj>({
      projects,
      resoveDepsArray: proj => proj.dependencies || [],
      projNameToCompare: proj => proj.name,
      onlyDepsForProject: 'not-related',
    }).map(c => c.name);

    expect(sorted).toEqual(['not-related']);
  });
  //#endregion

  //#region should detect circular dependencies
  it('should detect circular dependencies', () => {
    const circularProjects: Proj[] = [
      Proj.from({
        name: 'a',
        location: '/a',
        port: 1,
        dependencies: ['b'],
      }),
      Proj.from({
        name: 'b',
        location: '/b',
        port: 2,
        dependencies: ['c'],
      }),
      Proj.from({
        name: 'c',
        location: '/c',
        port: 3,
        dependencies: ['a'],
      }),
    ];

    expect(() =>
      UtilsProjects.sortGroupOfProject<Proj>({
        projects: circularProjects,
        resoveDepsArray: proj => proj.dependencies || [],
        projNameToCompare: proj => proj.name,
      }),
    ).toThrowError(/Circular dependency detected/);
  });
  //#endregion

  //#region should support duplicate names with unique keys
  it('should support duplicate names with unique keys', () => {
    const duplicatedProjects: Proj[] = [
      Proj.from({
        name: 'core',
        location: '/core-1',
        port: 1,
        dependencies: [],
      }),
      Proj.from({
        name: 'core',
        location: '/core-2',
        port: 2,
        dependencies: [],
      }),
      Proj.from({
        name: 'app',
        location: '/app',
        port: 3,
        dependencies: ['core'],
      }),
    ];

    const sorted = UtilsProjects.sortGroupOfProject<Proj>({
      projects: duplicatedProjects,
      resoveDepsArray: proj => proj.dependencies || [],
      projNameToCompare: proj => proj.name,
      projUniqueKeyToCompare: proj => `${proj.name}-${proj.port}`,
    });

    expect(sorted.map(c => `${c.name}-${c.port}`)).toEqual([
      'core-1',
      'core-2',
      'app-3',
    ]);
  });
  //#endregion

  //#region should apply override order
  it('should apply override order', () => {
    const sorted = UtilsProjects.sortGroupOfProject<Proj>({
      projects,
      resoveDepsArray: proj => proj.dependencies || [],
      projNameToCompare: proj => proj.name,
      overridePackagesOrder: ['ui', 'core'],
    }).map(c => c.name);

    expect(sorted).toEqual(['not-related', 'ui', 'core', 'app']);
  });
  //#endregion

  //#region shold sort ng talkback case

  it('shold sort ng talkback', () => {
    class ProjectBuildNotificaiton extends TaonBaseClass {
      static from(
        json: Partial<ProjectBuildNotificaiton>,
      ): ProjectBuildNotificaiton {
        if (!isObject(json)) {
          return;
        }
        return new ProjectBuildNotificaiton().clone(json);
      }

      get uniqueKey(): string {
        return `${this.location}__${this.nameForNpmPackage}__${this.port}`;
      }

      declare name?: string;

      declare nameForNpmPackage?: string;

      declare port?: string | number;

      declare location?: string;

      declare devModeDependenciesNames?: string[];
    }

    let projects = [
      {
        name: 'ng-talkback',
        buildType: 'watch',
        nameForNpmPackage: 'ng-talkback',
        location: 'c:/Users/darek/projects/npm/taon-dev/ng-talkback',
        port: 7777,
        devModeDependenciesNames: [],
        buildStatusInfo: {
          'backend-cjs': 'DONE_BUILDING_SUCCESS',
          'backend-esm': 'DONE_BUILDING_SUCCESS',
          'backend-js-maps': 'DONE_BUILDING_SUCCESS',
          browser: 'DONE_BUILDING_SUCCESS',
          websql: 'DONE_BUILDING_SUCCESS',
          'backend-watcher-error': '',
          'browser-watcher-error': '',
          'websql-watcher-error': '',
        },
        coreContainerVersion: 'v21',
      },
      {
        name: 'record-replay-req-res-scenario',
        buildType: 'watch',
        nameForNpmPackage: 'record-replay-req-res-scenario',
        location:
          'c:/Users/darek/projects/npm/taon-dev/record-replay-req-res-scenario',
        port: 7778,
        devModeDependenciesNames: ['ng-talkback', 'tnp-helpers'],
        buildStatusInfo: {
          'backend-cjs': 'DONE_BUILDING_SUCCESS',
          'backend-esm': 'DONE_BUILDING_SUCCESS',
          'backend-js-maps': 'DONE_BUILDING_SUCCESS',
          browser: 'DONE_BUILDING_SUCCESS',
          websql: 'DONE_BUILDING_SUCCESS',
          'backend-watcher-error': '',
          'browser-watcher-error': '',
          'websql-watcher-error': '',
        },
        coreContainerVersion: 'v21',
      },
    ].map(project => ProjectBuildNotificaiton.from(project as any));

    const sortedNgTalkback =
      UtilsProjects.sortGroupOfProject<ProjectBuildNotificaiton>({
        projects,
        resoveDepsArray: proj => proj.devModeDependenciesNames || [],
        projNameToCompare: proj => proj.name,
        onlyAffectedByProject: 'ng-talkback',
      }).map(c => c.name);

    expect(sortedNgTalkback).toEqual([
      'ng-talkback',
      'record-replay-req-res-scenario',
    ]);

    const sortedReplayRecord =
      UtilsProjects.sortGroupOfProject<ProjectBuildNotificaiton>({
        projects,
        resoveDepsArray: proj => proj.devModeDependenciesNames || [],
        projNameToCompare: proj => proj.name,
        onlyAffectedByProject: 'record-replay-req-res-scenario',
      }).map(c => c.name);

    expect(sortedReplayRecord).toEqual(['record-replay-req-res-scenario']);
  });

  //#endregion

  //#region should sort projects affected by multiple project
  it('should sort projects affected by multiple projects', () => {
    const projects: Proj[] = [
      Proj.from({ name: 'core', location: '/core', port: 1, dependencies: [] }),
      Proj.from({
        name: 'ui',
        location: '/ui',
        port: 2,
        dependencies: ['core'],
      }),
      Proj.from({
        name: 'api',
        location: '/api',
        port: 3,
        dependencies: ['core'],
      }),
      Proj.from({
        name: 'app',
        location: '/app',
        port: 4,
        dependencies: ['ui', 'api'],
      }),
      Proj.from({
        name: 'utils',
        location: '/utils',
        port: 5,
        dependencies: [],
      }),
      Proj.from({
        name: 'admin',
        location: '/admin',
        port: 6,
        dependencies: ['utils'],
      }),
      Proj.from({
        name: 'not-related',
        location: '/x',
        port: 7,
        dependencies: [],
      }),
    ];

    const sorted = UtilsProjects.sortGroupOfProject<Proj>({
      projects,
      resoveDepsArray: proj => proj.dependencies || [],
      projNameToCompare: proj => proj.name,
      onlyAffectedByProject: ['core', 'utils'],
    }).map(c => c.name);

    expect(sorted).toEqual(['core', 'ui', 'api', 'app', 'utils', 'admin']);
  });
  //#endregion
});
