import Angle, { widgetsAngle } from './widgets.angle';
import Annotation, { widgetsAnnotation } from './widgets.annotation';
import BiRuler, { widgetsBiruler } from './widgets.biruler';
import CrossRuler, { widgetsCrossRuler } from './widgets.crossRuler';
import Css from './widgets.css';
import Ellipse, { widgetsEllipse } from './widgets.ellipse';
import Freehand, { widgetsFreehand } from './widgets.freehand';
import Handle, { widgetsHandle } from './widgets.handle';
import PeakVelocity, { widgetsPeakVelocity } from './widgets.peakVelocity';
import Polygon, { widgetsPolygon } from './widgets.polygon';
import PressureHalfTime, { widgetsPressureHalfTime } from './widgets.pressureHalfTime';
import Rectangle, { widgetsRectangle } from './widgets.rectangle';
import Ruler, { widgetsRuler } from './widgets.ruler';
import VelocityTimeIntegral, { widgetsVelocityTimeIntegral } from './widgets.velocityTimeIntegral';
import VoxelProbe, { widgetsVoxelprobe } from './widgets.voxelProbe';

export {
    Angle as AngleWidget,
    widgetsAngle as angleWidgetFactory,
    Annotation as AnnotationWidget,
    widgetsAnnotation as annotationWidgetFactory,
    BiRuler as BiRulerWidget,
    widgetsBiruler as birulerWidgetFactory,
    CrossRuler as CrossRulerWidget,
    widgetsCrossRuler as crossrulerWidgetFactory,
    Ellipse as EllipseWidget,
    widgetsEllipse as ellipseWidgetFactory,
    Freehand as FreehandWidget,
    widgetsFreehand as freehandWidgetFactory,
    Handle as HandleWidget,
    widgetsHandle as handleWidgetFactory,
    PeakVelocity as PeakVelocityWidget,
    widgetsPeakVelocity as peakVelocityWidgetFactory, Polygon as PolygonWidget,
    widgetsPolygon as polygonWidgetFactory, PressureHalfTime as PressureHalfTimeWidget,
    widgetsPressureHalfTime as pressureHalfTimeWidgetFactory, Rectangle as RectangleWidget,
    widgetsRectangle as rectangleWidgetFactory,
    Ruler as RulerWidget,
    widgetsRuler as rulerWidgetFactory,
    VelocityTimeIntegral as VelocityTimeIntegralWidget,
    widgetsVelocityTimeIntegral as velocityTimeIntegralWidgetFactory,
    VoxelProbe as VoxelProbeWidget,
    widgetsVoxelprobe as voxelprobeWidgetFactory, Css as WidgetsCss
};
