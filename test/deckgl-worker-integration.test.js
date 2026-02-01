
import { expect } from 'chai';
import sinon from 'sinon';
import proxyquire from 'proxyquire';
import { JSDOM } from 'jsdom';

// Setup JSDOM environment for d3/DOM dependency
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="container"></div></body></html>');
global.window = dom.window;
global.document = dom.window.document;

// Handle navigator mocking carefully
if (!global.navigator) {
  global.navigator = dom.window.navigator;
} else {
  // If it exists but we want to patch it? usually unnecessary for these tests
  // We can leave it be if it satisfies basic checks
}

// Mock Worker class globally
class MockWorker {
  constructor(url) {
    this.url = url;
    this.onmessage = null;
  }
  postMessage(data) {
    // To be spied on
  }
  terminate() {
    // To be spied on
  }
}
global.Worker = MockWorker;

// Proxyquire allows us to mock the imports inside the controller
// We need to verify that we are mocking the right paths.
// The controller is in: src/js/treeVisualisation/DeckGLTreeAnimationController.js

describe('DeckGLTreeAnimationController Worker Integration', () => {
  let ControllerClass;
  let controller;
  let sandbox;
  let mockStore;
  let mockWorkerInstance;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    // Mock Store
    mockStore = {
      treeList: [
        { id: 'tree0' },
        { id: 'tree1' },
        { id: 'tree2' },
        { id: 'tree3' }
      ],
      movieData: null,
      branchTransformation: 'linear',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
      styleConfig: { labelOffsets: { DEFAULT: 20, EXTENSION: 5 } },
      animationProgress: 0,
      currentTreeIndex: 0,
      setAnimationStage: sandbox.stub(),
      stop: sandbox.stub(),
      play: sandbox.stub(),
    };

    const mockUseAppStore = {
      getState: sandbox.stub().returns(mockStore),
      setState: sandbox.stub()
    };
    // Mock the store module
    // We assume default export or named export based on usage

    // Mock other heavy dependencies to avoid instantiating them
    /* 
       Proxyquire doesn't work well with ESM. 
       We will rely on JSDOM to handle the real imports, and just stub the Worker 
       which is the focus of this test. 
       If dependencies like LayerManager cause issues, we might need a more advanced ESM masker like 'esmock'.
    */
    
    // Import the controller normally
    const module = await import('../src/js/treeVisualisation/DeckGLTreeAnimationController.js');
    ControllerClass = module.DeckGLTreeAnimationController;
    
    // Import the real store to seed it with data
    const { useAppStore } = await import('../src/js/core/store.js');
    
    // Seed the store
    useAppStore.setState({
      treeList: [
        { id: 'tree0' },
        { id: 'tree1' },
        { id: 'tree2' },
        { id: 'tree3' }
      ],
      movieData: null,
      branchTransformation: 'linear',
      layoutAngleDegrees: 360,
      layoutRotationDegrees: 0,
      styleConfig: { labelOffsets: { DEFAULT: 20, EXTENSION: 5 } },
      animationProgress: 0,
      currentTreeIndex: 0,
      // Ensure functions exist if called
      setAnimationStage: sandbox.stub(),
      stop: sandbox.stub(),
      play: sandbox.stub(),
    });

    // Spy on Worker constructor
    sandbox.spy(global, 'Worker');
  });

  afterEach(() => {
    sandbox.restore();
    if (controller) {
       controller.destroy();
    }
  });

  it('should initialize the worker and worker bindings', () => {
    controller = new ControllerClass('#container');

    expect(global.Worker.calledOnce).to.be.true;
    expect(controller.layoutWorker).to.be.instanceOf(MockWorker);
    expect(controller.requestedFrames).to.be.instanceOf(Set);

    // Capture the worker instance
    mockWorkerInstance = controller.layoutWorker;
    // Bind mock method for easier spying
    sandbox.spy(mockWorkerInstance, 'postMessage');
  });

  it('should send prefetch message to worker when _prefetchFrame is called', () => {
    controller = new ControllerClass('#container');
    mockWorkerInstance = controller.layoutWorker;
    sandbox.spy(mockWorkerInstance, 'postMessage');

    // Trigger prefetch manually (it's private but we can access it via array notation or just call)
    controller._prefetchFrame(1);

    expect(mockWorkerInstance.postMessage.calledOnce).to.be.true;
    const callArgs = mockWorkerInstance.postMessage.firstCall.args[0];

    expect(callArgs.jobId).to.equal('1');
    expect(callArgs.command).to.equal('CALCULATE_LAYOUT');
    expect(callArgs.data.treeData).to.deep.equal({ id: 'tree1' });
    expect(callArgs.data.options.branchTransformation).to.equal('linear');
    expect(controller.requestedFrames.has(1)).to.be.true;
  });

  it('should skip prefetch if already requested', () => {
    controller = new ControllerClass('#container');
    mockWorkerInstance = controller.layoutWorker;
    sandbox.spy(mockWorkerInstance, 'postMessage');

    controller._prefetchFrame(1);
    expect(mockWorkerInstance.postMessage.calledOnce).to.be.true;

    // Call again
    controller._prefetchFrame(1);
    expect(mockWorkerInstance.postMessage.calledOnce).to.be.true; // Still once
  });

  it('should verify worker response updates the cache', () => {
    controller = new ControllerClass('#container');

    // Spy on cache setPrecomputedData (InterpolationCache is real, so method exists)
    sandbox.spy(controller.interpolationCache, 'setPrecomputedData');

    // Simulate worker success message
    const workerResponse = {
      data: {
        jobId: '2',
        status: 'SUCCESS',
        result: {
           layout: { some: 'layout' },
           layerData: { some: 'data' }
        }
      }
    };

    // Trigger the onmessage handler
    controller.layoutWorker.onmessage(workerResponse);

    expect(controller.interpolationCache.setPrecomputedData.calledOnce).to.be.true;
    expect(controller.interpolationCache.setPrecomputedData.firstCall.args[0]).to.equal(2);
    expect(controller.interpolationCache.setPrecomputedData.firstCall.args[1]).to.deep.equal(workerResponse.data.result);
  });

  it('should handle worker errors gracefully', () => {
    controller = new ControllerClass('#container');
    controller.requestedFrames.add(3);

    const errorResponse = {
      data: {
        jobId: '3',
        status: 'ERROR',
        error: 'Calculation exploded'
      }
    };

    // Spy on console.warn to verify error logging
    sandbox.spy(console, 'warn');

    controller.layoutWorker.onmessage(errorResponse);

    expect(console.warn.called).to.be.true;
    // Should remove from requestedFrames so it can be retried
    expect(controller.requestedFrames.has(3)).to.be.false;
  });

  it('should trigger prefetch on animation progress update', () => {
    controller = new ControllerClass('#container');
    mockWorkerInstance = controller.layoutWorker;
    sandbox.spy(mockWorkerInstance, 'postMessage');

    // AnimationRunner is instantiated inside controller constructor.
    // We need to inspect how 'updateProgress' callback was passed to it.
    // Since real AnimationRunner is used, we can simulate the callback if we access it,
    // OR we can trigger it via the runner if exposed.
    // But AnimationRunner's updateProgress calls the callback passed in options.

    // Let's grab the updateProgress callback stored in the AnimationRunner instance
    const runner = controller.animationRunner;

    // Trigger updateProgress for progress 0.0 (Tree 0) -> Should prefetch 1 & 2
    runner.updateProgress(0.0);

    expect(mockWorkerInstance.postMessage.calledTwice).to.be.true;

    const calls = mockWorkerInstance.postMessage.getCalls();
    expect(calls[0].args[0].jobId).to.equal('1');
    expect(calls[1].args[0].jobId).to.equal('2');
  });

  it('should terminate worker on destroy', () => {
    controller = new ControllerClass('#container');
    mockWorkerInstance = controller.layoutWorker;
    sandbox.spy(mockWorkerInstance, 'terminate');

    controller.destroy();

    expect(mockWorkerInstance.terminate.calledOnce).to.be.true;
    // Prevent double destroy in afterEach
    controller = null;
  });

});
