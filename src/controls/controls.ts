import ControlsOrbit, { orbit } from './controls.orbit';
import ControlsTrackball, { trackball } from './controls.trackball';
import TrackballOrtho, { trackballOrtho } from './controls.trackballortho';

export {
    ControlsOrbit as OrbitControl,
    orbit as orbitControlFactory, ControlsTrackball as TrackballControl,
    trackball as trackballControlFactory,
    TrackballOrtho as TrackballOrthoControl,
    trackballOrtho as trackballOrthoControlFactory
};
