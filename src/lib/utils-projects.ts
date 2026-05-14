export namespace UtilsProjects {
  export interface OrderAbleProject {
    location?: string;
    name?: string;
  }

  //#region apply order
  const applyOverrideOrder = <T>(
    sorted: T[],
    getOverrideKey: (p: T) => string,
    overrideOrder: string[],
  ): T[] => {
    if (!overrideOrder?.length) {
      return sorted;
    }

    const overrideSet = new Set(
      overrideOrder.map(o => o.trim()).filter(Boolean),
    );

    // keep all matching projects, even if there are multiple with same "name-like" value
    const overridden = sorted.filter(p => overrideSet.has(getOverrideKey(p)));

    if (!overridden.length) {
      return sorted;
    }

    const remaining = sorted.filter(p => !overrideSet.has(getOverrideKey(p)));

    // preserve duplicates properly and in exact overrideOrder sequence
    const grouped = new Map<string, T[]>();
    overridden.forEach(p => {
      const key = getOverrideKey(p);
      const arr = grouped.get(key) || [];
      arr.push(p);
      grouped.set(key, arr);
    });

    const overriddenSorted: T[] = [];
    overrideOrder.forEach(key => {
      const arr = grouped.get(key);
      if (arr?.length) {
        overriddenSorted.push(...arr);
      }
    });

    const firstIndex = sorted.findIndex(p =>
      overrideSet.has(getOverrideKey(p)),
    );

    return [
      ...remaining.slice(0, firstIndex),
      ...overriddenSorted,
      ...remaining.slice(firstIndex),
    ];
  };
  //#endregion

  //#region fields & getters / sort group of projects
  export const sortGroupOfProject = <T extends OrderAbleProject>(options: {
    /**
     * Projects that needs to be sorted by dependencies
     */
    projects: T[];
    /**
     * How to resolve dependencies array:
     * exmaple: proj => proj.dependencies # or something similar
     */
    resoveDepsArray: (proj: T) => string[];
    /**
     * each project has name that is being use also for project.dependencies list.
     * exmaple: proj => proj.name
     */
    projNameToCompare: (proj: T) => string;
    /**
     * Since there may be duplicated project with the same name but diffrent
     * other propers => this is a way to compares projects
     * example: proj => proj.uniqueKey # or other unique property
     * <uniqueKey may be for example: projectName+Localtion+port>
     */
    projUniqueKeyToCompare?: (proj: T) => string;
    /**
     * Override packages order (sometimes needed for some hacks)
     */
    overridePackagesOrder?: string[];
    /**
     * Filter project and give me only deps for specyfic proj
     */
    onlyDepsForProject?: string;
    /**
     * Filter projects and return only projects affected by this project.
     *
     * Example:
     * core changed
     * -> ui depends on core
     * -> app depends on ui
     *
     * result:
     * ['core', 'ui', 'app']
     */
    onlyAffectedByProject?: string;
  }): T[] => {
    let {
      projects,
      projUniqueKeyToCompare,
      overridePackagesOrder,
      projNameToCompare,
      resoveDepsArray,
    } = options;
    if (!projUniqueKeyToCompare) {
      projUniqueKeyToCompare = projNameToCompare;
    }

    if (!overridePackagesOrder) {
      overridePackagesOrder = [];
    }

    const visited: Record<string, boolean> = {};
    const stack: Record<string, boolean> = {};
    const result: T[] = [];

    const visit = (project: T) => {
      const uniqueKey = projUniqueKeyToCompare(project);

      if (stack[uniqueKey]) {
        throw new Error(
          `Circular dependency detected involving project: ${uniqueKey}`,
        );
      }

      if (visited[uniqueKey]) {
        return;
      }

      visited[uniqueKey] = true;
      stack[uniqueKey] = true;

      const depsResolved = resoveDepsArray(project);

      depsResolved.forEach(dependency => {
        // dependency is still resolved by logical project name
        // so multiple projects with same name can all be included
        const dependentProjects = projects.filter(
          p => projNameToCompare(p) === dependency,
        );

        dependentProjects.forEach(dependentProject => {
          visit(dependentProject);
        });
      });

      stack[uniqueKey] = false;
      result.push(project);
    };

    if (options.onlyAffectedByProject) {
      const affectedNames = new Set<string>();

      const collectAffected = (projectName: string) => {
        if (affectedNames.has(projectName)) {
          return;
        }

        affectedNames.add(projectName);

        const dependentProjects = projects.filter(project => {
          const deps = resoveDepsArray(project) || [];
          return deps.includes(projectName);
        });

        dependentProjects.forEach(project => {
          collectAffected(projNameToCompare(project));
        });
      };

      collectAffected(options.onlyAffectedByProject);

      const affectedProjects = projects.filter(project =>
        affectedNames.has(projNameToCompare(project)),
      );

      return UtilsProjects.sortGroupOfProject<T>({
        projects: affectedProjects,
        resoveDepsArray,
        projNameToCompare,
        projUniqueKeyToCompare,
        overridePackagesOrder,
      });
    }

    if (options.onlyDepsForProject) {
      const rootProjects = projects.filter(
        p => projNameToCompare(p) === options.onlyDepsForProject,
      );

      rootProjects.forEach(project => visit(project));

      return applyOverrideOrder(
        result.reverse(),
        projUniqueKeyToCompare,
        overridePackagesOrder,
      );
    }

    projects.forEach(project => visit(project));

    return applyOverrideOrder(
      result,
      projUniqueKeyToCompare,
      overridePackagesOrder,
    );
  };
  //#endregion
}
