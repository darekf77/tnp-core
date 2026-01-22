import { Taon, TaonBaseMigration, TaonMigration } from 'taon/src';
import { QueryRunner } from 'taon-typeorm/src';

//#region Migration class for context "MainContext"
@TaonMigration({
  className: 'MainContext_1769090821218_aa',
})
export class MainContext_1769090821218_aa extends TaonBaseMigration {
  //#region is migration for context MainContext ready to run
  /**
   * IMPORTANT !!!
   * remove this method if you are ready to run this migration
   */
  public isReadyToRun(): boolean {
    return false;
  }
  //#endregion

  //#region up
  async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.startTransaction();
    try {
      // do "something" in db

      await queryRunner.commitTransaction();
    } catch (error) {
      console.error('Error in migration:', error);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
  //#endregion

  //#region down
  async down(queryRunner: QueryRunner): Promise<any> {
    // revert this "something" in db
    // await queryRunner.clearDatabase()
  }
  //#endregion
}
//#endregion
