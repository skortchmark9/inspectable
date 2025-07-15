import { ChecklistDefinition } from '../types/checklist';

export const PRE_INSPECTION_CHECKLIST: ChecklistDefinition = {
  id: 'pre_inspection',
  name: 'Pre-Inspection Report',
  categories: [
    {
      id: 'hvac',
      name: 'HVAC',
      keywords: ['furnace', 'thermostat', 'ductwork', 'air handler', 'condenser'],
      specificItems: [
        { id: 'central_air_photo', name: 'Central Air Unit', keywords: ['furnace', 'air handler'], required: true, requireDatasheet: true },
        { id: 'unit_exterior_wall', name: 'Unit Against Exterior Wall', keywords: ['furnace', 'condenser'], required: true },
        { id: 'thermostat_photo', name: 'Thermostat Photo', keywords: ['thermostat'], required: false }
      ]
    },
    {
      id: 'heat_pump_hot_water',
      name: 'Heat Pump Domestic Hot Water',
      keywords: ['water heater', 'heat pump', 'hot water'],
      specificItems: [
        { id: 'water_heater', name: 'Water Heater', keywords: ['water heater'], required: true, requireDatasheet: true },
      ]
    },
    {
      id: 'fuel_switching',
      name: 'Fuel Switching',
      keywords: ['dryer', 'stove', 'oven', 'kitchen', 'range hood', 'fridge', 'dishwasher'],
      specificItems: [
        { id: 'dryer_photo', name: 'Dryer', keywords: ['dryer'], required: true, requireDatasheet: true },
        { id: 'oven_photo', name: 'Oven', keywords: ['oven', 'stove', 'range', 'range hood'], required: true, requireDatasheet: true },
      ]
    },
    {
      id: 'electrical_make_ready',
      name: 'Electric Make-Ready',
      keywords: ['electric meter', 'breaker box', 'electrical panel'],
      specificItems: [
        { id: 'breaker_panel', name: 'Breaker Panel', keywords: ['breaker', 'electrical panel'], required: true }
      ]
    },
    {
      id: 'decommissioning',
      name: 'Decommissioning Make-Ready',
      keywords: ['gas meter'],
      specificItems: [
        { id: 'gas_meter', name: 'Gas Meter', keywords: ['gas meter'], required: true }
      ]
    },
    {
      id: 'blower_door',
      name: 'Blower Door Test',
      keywords: ['blower door'],
      specificItems: [
        { id: 'blower door', name: 'Blower Door Readout', keywords: ['blower door'], required: true }
      ]
    },
    {
      id: 'weatherization',
      name: 'Weatherization',
      keywords: ['window', 'exterior', 'interior', 'insulation', 'wall', 'hole', 'attic', 'basement - finished', 'basement - unfinished', 'garage', 'living room', 'bathroom']
    },
    {
      id: 'health_safety',
      name: 'Health & Safety',
      keywords: ['smoke detector']
    }
  ]
};

export const DEFAULT_CHECKLIST = PRE_INSPECTION_CHECKLIST;