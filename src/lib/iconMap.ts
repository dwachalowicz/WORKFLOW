/**
 * Dynamic icon resolver for rendering icons by name.
 * Used by ProcessesTab, WorkspacesTab, SimpleNode, etc.
 * 
 * This avoids `import * as LucideIcons` in consumer files,
 * which would bundle ALL 1000+ icons (~200KB+).
 * 
 * The full `import *` is only needed in icon-picker components
 * (IconPickerDropdown, AvatarCropModal) where users browse all icons.
 */
import {
  FileText, Folder, Star, Heart, Zap, Shield, Target, Flag,
  BookOpen, Lightbulb, Coffee, Globe, Award, Briefcase, Clock,
  Code, Database, Film, Gift, Hash, Key, Layers, Link, Mail,
  Map, Music, Package, Pen, Phone, Rocket, Search, Server,
  Settings, ShoppingCart, Smartphone, Sun, Tag, Terminal,
  ThumbsUp, Trash2, Truck, Tv, Umbrella, User, Video, Wifi,
  AlertTriangle, Activity, Anchor, Archive, ArrowRight, AtSign,
  Battery, Bell, Bluetooth, Bold, Bookmark, Box, Calendar,
  Camera, Check, CheckSquare, ChevronRight, Clipboard, ClipboardCheck, Cloud, Compass,
  Copy, CreditCard, Crop, Crosshair, DollarSign, Download,
  Droplet, Edit, Eye, Feather, File, FileCheck, Filter,
  FolderOpen, Frown, Grid, Headphones, Home, Image,
  Inbox, Info, Italic, Layout, LifeBuoy, List, Lock,
  LogIn, LogOut, MapPin, Maximize, Menu, MessageCircle,
  MessageSquare, Mic, Minimize, Monitor, Moon, MoreHorizontal,
  MoreVertical, Move, Navigation, Octagon, Paperclip, Pause,
  PenTool, Percent, PieChart, Play, Plus, Power,
  Printer, Radio, RefreshCw, Repeat, RotateCw, Rss, Save,
  Scissors, Send, Share2, ShoppingBag, Sidebar, SkipBack,
  SkipForward, Slash, Sliders, Square, StopCircle, Sunrise,
  Sunset, Table, Tablet, ToggleLeft,
  TrendingUp, Triangle, Type, Underline, Unlock, Upload,
  UserCheck, UserMinus, UserPlus, Users, Volume2, Watch,
  Wind, X, XCircle, ZoomIn, ZoomOut,
  Brain, Building, Building2, Car, Cat, CircleDot, Cog,
  Component, Container, Cookie, Crown, Diamond,
  Flame, Flower, Gauge, Gem,
  Ghost, GraduationCap, Hammer, HardDrive, Hexagon,
  Highlighter, History, Hourglass,
  Landmark, Languages, Laptop, Leaf, Library, LineChart,
  Locate, Magnet,
  Mountain, MousePointer, Network, Newspaper, Paintbrush,
  Palette, Plane, Plug, Puzzle,
  QrCode, Rainbow, Receipt, Recycle,
  Reply, Ruler, Scale, Scan, School, ScreenShare,
  ScrollText, Shapes, Share, Sheet, Ship, Shirt,
  Signal, Skull, Snowflake, Sparkle,
  Sparkles, Split, Sprout, Stamp,
  Stethoscope, Store, Swords,
  Telescope, TestTube, Ticket, Timer, Tornado,
  Trophy,
  ArrowLeft, ArrowUp, ArrowDown, ArrowUpRight, ArrowUpLeft, ArrowDownRight, ArrowDownLeft,
  ChevronLeft, ChevronUp, ChevronDown, MoveLeft, MoveRight, MoveUp, MoveDown, Navigation2,
  Bot, Cpu, Waypoints, GitBranch, GitMerge, FileSpreadsheet, FileJson, FileCode, FileImage,
  Wand2, Calculator, ArrowRightLeft, Link2, Workflow, Boxes, Braces, Brackets, TerminalSquare,
  ShieldAlert, ShieldCheck, PlayCircle, Clock, TimerReset, Repeat1, ArrowDownToLine, ArrowUpFromLine,
  type LucideIcon
} from 'lucide-react';

/**
 * Map of commonly used icon names to their components.
 * Covers all icons available in the icon picker.
 */
export const ICON_MAP: Record<string, LucideIcon> = {
  FileText, Folder, Star, Heart, Zap, Shield, Target, Flag,
  BookOpen, Lightbulb, Coffee, Globe, Award, Briefcase, Clock,
  Code, Database, Film, Gift, Hash, Key, Layers, Link, Mail,
  Map, Music, Package, Pen, Phone, Rocket, Search, Server,
  Settings, ShoppingCart, Smartphone, Sun, Tag, Terminal,
  ThumbsUp, Trash2, Truck, Tv, Umbrella, User, Video, Wifi,
  AlertTriangle, Activity, Anchor, Archive, ArrowRight, AtSign,
  Battery, Bell, Bluetooth, Bold, Bookmark, Box, Calendar,
  Camera, Check, CheckSquare, ChevronRight, Clipboard, ClipboardCheck, Cloud, Compass,
  Copy, CreditCard, Crop, Crosshair, DollarSign, Download,
  Droplet, Edit, Eye, Feather, File, FileCheck, Filter,
  FolderOpen, Frown, Grid, Headphones, Home, Image,
  Inbox, Info, Italic, Layout, LifeBuoy, List, Lock,
  LogIn, LogOut, MapPin, Maximize, Menu, MessageCircle,
  MessageSquare, Mic, Minimize, Monitor, Moon, MoreHorizontal,
  MoreVertical, Move, Navigation, Octagon, Paperclip, Pause,
  PenTool, Percent, PieChart, Play, Plus, Power,
  Printer, Radio, RefreshCw, Repeat, RotateCw, Rss, Save,
  Scissors, Send, Share2, ShoppingBag, Sidebar, SkipBack,
  SkipForward, Slash, Sliders, Square, StopCircle, Sunrise,
  Sunset, Table, Tablet, ToggleLeft,
  TrendingUp, Triangle, Type, Underline, Unlock, Upload,
  UserCheck, UserMinus, UserPlus, Users, Volume2, Watch,
  Wind, X, XCircle, ZoomIn, ZoomOut,
  Brain, Building, Building2, Car, Cat, CircleDot, Cog,
  Component, Container, Cookie, Crown, Diamond,
  Flame, Flower, Gauge, Gem,
  Ghost, GraduationCap, Hammer, HardDrive, Hexagon,
  Highlighter, History, Hourglass,
  Landmark, Languages, Laptop, Leaf, Library, LineChart,
  Locate, Magnet,
  Mountain, MousePointer, Network, Newspaper, Paintbrush,
  Palette, Plane, Plug, Puzzle,
  QrCode, Rainbow, Receipt, Recycle,
  Reply, Ruler, Scale, Scan, School, ScreenShare,
  ScrollText, Shapes, Share, Sheet, Ship, Shirt,
  Signal, Skull, Snowflake, Sparkle,
  Sparkles, Split, Sprout, Stamp,
  Stethoscope, Store, Swords,
  Telescope, TestTube, Ticket, Timer, Tornado,
  Trophy,
  ArrowLeft, ArrowUp, ArrowDown, ArrowUpRight, ArrowUpLeft, ArrowDownRight, ArrowDownLeft,
  ChevronLeft, ChevronUp, ChevronDown, MoveLeft, MoveRight, MoveUp, MoveDown, Navigation2,
  Bot, Cpu, Waypoints, GitBranch, GitMerge, FileSpreadsheet, FileJson, FileCode, FileImage,
  Wand2, Calculator, ArrowRightLeft, Link2, Workflow, Boxes, Braces, Brackets, TerminalSquare,
  ShieldAlert, ShieldCheck, PlayCircle, Clock, TimerReset, Repeat1, ArrowDownToLine, ArrowUpFromLine,
};

/**
 * Get a Lucide icon component by name.
 * Returns undefined if the icon name is not in the map.
 */
export const getIcon = (name: string | undefined): LucideIcon | undefined => {
  if (!name) return undefined;
  return ICON_MAP[name];
};
