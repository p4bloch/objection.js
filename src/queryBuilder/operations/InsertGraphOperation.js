import DelegateOperation from './DelegateOperation';
import InsertOperation from './InsertOperation';

import insertFuncBuilder from '../graphInserter/inserter';
import GraphInserter from '../graphInserter/GraphInserter';

export default class InsertGraphOperation extends DelegateOperation {

  constructor(name, opt) {
    super(name, opt);

    if (!this.delegate.is(InsertOperation)) {
      throw new Error('Invalid delegate');
    }

    // Our delegate operation inherits from `InsertOperation`. Disable the call-time
    // validation. We do the validation in onAfterQuery instead.
    this.delegate.modelOptions.skipValidation = true;
  }

  call(builder, args) {
    const retVal = super.call(builder, args);

    // We resolve this query here and will not execute it. This is because the root
    // value may depend on other models in the graph and cannot be inserted first.
    builder.resolve([]);

    return retVal;
  }

  get models() {
    return this.delegate.models;
  }

  get isArray() {
    return this.delegate.isArray;
  }

  onBefore() {
    // Do nothing.
  }

  onBeforeInternal() {
    // Do nothing. We override this with empty implementation so that
    // the $beforeInsert() hooks are not called twice for the root models.
  }

  onBeforeBuild() {
    // Do nothing.
  }

  onBuild() {
    // Do nothing.
  }

  // We overrode all other hooks but this one and do all the work in here.
  // This is a bit hacky.
  onAfterQuery(builder) {
    const ModelClass = builder.modelClass();
    const insertFunc = insertFuncBuilder(builder);
    const graphInserter = new GraphInserter({
      modelClass: ModelClass,
      models: this.models,
      allowedRelations: builder._allowedInsertExpression || null,
      knex: builder.knex()
    });

    return graphInserter.execute(insertFunc).then(() => {
      return super.onAfterQuery(builder, this.models)
    });
  }

  onAfterInternal() {
    // We override this with empty implementation so that the $afterInsert() hooks
    // are not called twice for the root models.
    return this.isArray ? this.models : (this.models[0] || null);
  }
}
