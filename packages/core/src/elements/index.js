// @ts-check
/**
 * Barrel for the element definitions. Each component lives in its own file
 * (Button.js, Card.js, ...); this module imports them statically (so bundlers
 * can tree-shake) and exposes them as one ordered list. `../registry.js` indexes
 * the list by name and adds the lookup helpers.
 *
 * To add a component: create `<Name>.js` here and add it to ELEMENTS below.
 */
import Wireframe from './Wireframe.js';
import Stack from './Stack.js';
import Box from './Box.js';
import Grid from './Grid.js';
import Spacer from './Spacer.js';
import Divider from './Divider.js';
import Card from './Card.js';
import CardContent from './CardContent.js';
import CardActions from './CardActions.js';
import AppBar from './AppBar.js';
import Toolbar from './Toolbar.js';
import Link from './Link.js';
import Typography from './Typography.js';
import Button from './Button.js';
import TextField from './TextField.js';
import Img from './Img.js';
import Chip from './Chip.js';
import Icon from './Icon.js';
import List from './List.js';
import ListItem from './ListItem.js';
import Control from './Control.js';

/** Every element definition, grouped by category. @type {import('./common.js').ComponentDef[]} */
export const ELEMENTS = [
  Wireframe,
  Stack, Box, Grid, Spacer, Divider,
  Card, CardContent, CardActions, AppBar, Toolbar,
  Link,
  Typography, Button, TextField, Img, Chip, Icon, List, ListItem,
  Control,
];

export { FILLER_STYLES, PRESETS } from './common.js';
