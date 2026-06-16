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
import Anchor from './Anchor.js';
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
import Placeholder from './Placeholder.js';
import Chip from './Chip.js';
import Icon from './Icon.js';
import List from './List.js';
import ListItem from './ListItem.js';
import Control from './Control.js';
import CardHeader from './CardHeader.js';
import AccordionHeader from './AccordionHeader.js';
import AccordionBody from './AccordionBody.js';
import Drawer from './Drawer.js';
import MenuItem from './MenuItem.js';
import Menubar from './Menubar.js';
import Tabs from './Tabs.js';
import Tab from './Tab.js';
import Breadcrumbs from './Breadcrumbs.js';
import Stepper from './Stepper.js';
import Step from './Step.js';
import Pagination from './Pagination.js';
import BottomNavigation from './BottomNavigation.js';
import BottomNavigationAction from './BottomNavigationAction.js';
import Avatar from './Avatar.js';
import Table from './Table.js';
import TableHead from './TableHead.js';
import TableBody from './TableBody.js';
import TableFooter from './TableFooter.js';
import TableRow from './TableRow.js';
import TableCell from './TableCell.js';
import Badge from './Badge.js';
import Select from './Select.js';
import Option from './Option.js';
import Slider from './Slider.js';
import Rating from './Rating.js';
import Calendar from './Calendar.js';
import ToggleButtonGroup from './ToggleButtonGroup.js';
import ToggleButton from './ToggleButton.js';
import ButtonGroup from './ButtonGroup.js';
import Fab from './Fab.js';
import Alert from './Alert.js';
import Dialog from './Dialog.js';
import DialogHeader from './DialogHeader.js';
import DialogContent from './DialogContent.js';
import DialogActions from './DialogActions.js';
import Snackbar from './Snackbar.js';
import Progress from './Progress.js';
import Skeleton from './Skeleton.js';

/** Every element definition, grouped by category. @type {import('./common.js').ComponentDef[]} */
export const ELEMENTS = [
  Wireframe,
  Stack, Box, Grid, Spacer, Anchor, Divider,
  Card, CardHeader, CardContent, CardActions, AppBar, Toolbar,
  AccordionHeader, AccordionBody,
  Drawer, Link, MenuItem, Menubar, Tabs, Tab, Breadcrumbs,
  Stepper, Step, Pagination, BottomNavigation, BottomNavigationAction,
  Typography, Button, TextField, Img, Placeholder, Avatar, Chip, Icon, List, ListItem,
  Table, TableHead, TableBody, TableFooter, TableRow, TableCell, Badge,
  Control, Select, Option, Slider, Rating, Calendar,
  ToggleButtonGroup, ToggleButton, ButtonGroup, Fab,
  Alert, Dialog, DialogHeader, DialogContent, DialogActions, Snackbar, Progress, Skeleton,
];

export { FILLER_STYLES, PRESETS } from './common.js';
