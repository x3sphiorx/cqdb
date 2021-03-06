import React, { Component, } from 'react';
import {
  Button,
  Col,
  Grid,
  ListGroupItem,
  Media,
  Row,
} from 'react-bootstrap';
import { LinkContainer, } from 'react-router-bootstrap';

import { renderCheckboxes, } from '../components/renderCheckboxes';
import { renderModal, } from '../components/renderModal';
import { renderResults, } from '../components/renderResults';
import { renderSelects, } from '../components/renderSelects';
import { renderTextArea, } from '../components/renderTextArea';
import { calculateStat, } from '../util/calculateStat';
import { countFilters, } from '../util/countFilters';
import { filterByText, filterByCheckbox, } from '../util/filters';
import { imagePath, } from '../util/imagePath';
import { range, } from '../util/range';
import { resolve, } from '../util/resolve';
import { sortBySelection, } from '../util/sortBySelection';
import { toTitleCase, } from '../util/toTitleCase';
import { parseURL, updateURL, } from '../util/url';

// const frivberryData = require('../Decrypted/frivolous_character_addstatmax.json');
// const frivHeroData = require('../Decrypted/frivolous_character_visual.json');
// const frivStatData = require('../Decrypted/frivolous_character_stat.json');

const berryData = require('../Decrypted/get_character_addstatmax.json').character_addstatmax
  // .concat(frivberryData);
const heroData = require('../Decrypted/filtered_character_visual.json')
  // .concat(frivHeroData);
const sbwData = require('../Decrypted/filtered_weapon_sbw.json');
const skinData = require('../Decrypted/filtered_costume.json');
const statData = require('../Decrypted/filtered_character_stat.json')
  // .concat(frivStatData);

let statLabels = [
  'HP',
  'Atk. Power',
  'Crit.Chance',
  'Crit.Damage',
  'Armor',
  'Resistance',
  'Accuracy',
  'Evasion',
];
statLabels = statLabels.concat(statLabels.map(i => `Base ${i}`), statLabels.map(i => `Berry ${i}`));
const filterCategories = ['Star', 'Class', 'Rarity', 'Faction', 'Gender', 'Has Sbw', 'Has Skin', 'Has Portrait', 'Archetype', 'Hero',];
const sortCategories = ['By', 'Order',];

// parse data files
const data = heroData.map(hero => {
  // find hero's respective stat and berry data
  const stat = statData[statData.findIndex(i => i.id === hero.default_stat_id)];
  const berry = stat.grade === 6 && hero.id !== 'CHA_WA_SUPPORT_6_1'
    ? berryData[berryData.findIndex(i => i.id === stat.addstat_max_id)]
    : {};

  const image = hero.face_tex;
  const name = resolve(hero.name);

  // make hero's filterable object
  const hasSbw = stat.grade < 4
    ? hero.rarity === 'DESTINY' ? 'Yes' : 'No'
    : sbwData.some(j => j.reqhero.includes(hero.id)) ? 'Yes' : 'No';

  const f = [
    stat.grade.toString(),
    `TEXT_CLASS_${hero.classid.substring(4)}`,
    `TEXT_CONFIRM_SELL_${hero.rarity === 'LEGENDARY' ? (hero.isgachagolden ? 'IN_GACHA' : 'LAGENDARY') : hero.rarity}_HERO`,
    !hero.domain || ['CHEN',].includes(hero.domain)
      ? 'Unknown' // remove unreleased domains
      : hero.domain === 'NONEGROUP' ? `TEXT_CHAMP_DOMAIN_${hero.domain}_NAME` : `TEXT_CHAMPION_DOMAIN_${hero.domain}`,
    `TEXT_EXPLORE_TOOLTIP_GENDER_${hero.gender}`,
    hasSbw,
    skinData.some(i => i.wearable_charid.includes(hero.id)) ? 'Yes' : 'No',
    hero.portrait !== null ? 'Yes' : 'No',
  ].map(resolve);

  // filter null entries, resolve and match words, filter no match cases
  let archetype = [
    stat.skill_desc,
    stat.skill_subdesc,
    hasSbw === 'Yes' && stat.grade >= 4
      ? sbwData[sbwData.findIndex(j => parseInt(j.grade, 10) === stat.grade && j.reqhero.includes(hero.id))].desc
      : null,
  ]
  .filter(j => j)
  .map(j => resolve(j).match(/physical|magic|neutral|heal|3.chain|stun|push|reflect|receives all/gi))
  .filter(j => j);

  // flatten, map to titlecase, and remove duplicates
  archetype = [...new Set([].concat(...archetype).map(toTitleCase))];

  if (!archetype.length) {
    archetype = ['None',];
  }

  // add archetype filter
  f.push(archetype);

  // add easter egg filter
  f.push(resolve(hero.desc).startsWith('(Easter Egg)') ? 'Easter Egg' : 'Real');

  const filterable = {};
  filterCategories.forEach((i, index) => filterable[i] = f[index]);

  // make hero's sortable object
  const level = stat.grade * 10;
  const breadTraining = [stat.grade - 1];
  const baseStats = breadTraining.map(i => {
    const calculatedStats = [
      calculateStat(stat.initialhp, stat.growthhp, level, i),
      calculateStat(stat.initialattdmg, stat.growthattdmg, level, i),
      stat.critprob,
      stat.critpower,
      calculateStat(stat.defense, stat.growthdefense, level, i),
      calculateStat(stat.resist, stat.growthresist, level, i),
      stat.hitrate,
      stat.dodgerate,
    ];

    const b = {}
    for (let j = 0; j < calculatedStats.length; ++j) {
      b[statLabels[j]] = calculatedStats[j];
      b[statLabels[j + statLabels.length * 1 / 3]] = calculatedStats[j];
      b[statLabels[j + statLabels.length * 2 / 3]] = 0;
    }
    return b;
  });

  const sortable = baseStats[0];
  if (Object.keys(berry).length) {
    const berryStats = [
      berry.hp,
      berry.attack_power,
      berry.critical_chance,
      berry.critical_damage,
      berry.armor,
      berry.resistance,
      berry.accuracy,
      berry.dodge,
    ];

    for (let i = 0; i < berryStats.length; ++i) {
      sortable[statLabels[i]] += berryStats[i];
      sortable[statLabels[i + statLabels.length * 2 / 3]] += berryStats[i];
    }
  }

  // match game's decimal places
  const rounding = [1, 1, 2, 2, 1, 1, 2, 2,];
  statLabels.forEach((i, index) => {
    sortable[i] = parseFloat(sortable[i].toFixed(rounding[index % rounding.length]));
  });

  // add name as a sortable field
  sortable['Name'] = name;

  return {
    image: image,
    filterable: filterable,
    name: name,
    sortable: sortable,
  };
})
.reverse(); // show latest heroes at the top by default

// initialize checkboxes
const checkboxes = (() => {
  const filterLabels = [
    range(6).map(i => i.toString()),
    ['Warrior', 'Paladin', 'Archer', 'Hunter', 'Wizard', 'Priest',],
    [
      'Legendary Hero',
      'Contract only Hero',
      'Promotion Hero',
      'Secret Hero',
      'Normal Hero',
      'Supply Hero',
    ],
    [
      'Grancia Empire',
      'Eastern Kingdom - Ryu',
      'Neth Empire',
      'Southwestern Alliance',
      'Eastern Kingdom - Han',
      'Roman Republic',
      'Heroes of Freedom',
      'Pumpkin City',
      'Order of the Goddess',
      'Nosgard',
      'Minor Tribes\' Confederation',
      'Supply all forces',
      'Unknown',
    ],
    ['Male', 'Female',],
    ['Yes', 'No',],
    ['Yes', 'No',],
    ['Yes', 'No',],
    ['Physical', 'Magic', 'Neutral', 'Heal', '3-chain', 'Stun', 'Push', 'Reflect', 'Receives all', 'None',],
    ['Real', 'Easter Egg',],
  ];

  const c = {};
  filterCategories.forEach((i, index) => c[i] = filterLabels[index]);
  return c;
})();

// initialize sort's select labels and options
const selects = (() => {
  const sortOptions = [
    ['Default', 'Name',].concat(statLabels),
    ['Descending', 'Ascending',],
  ];

  const s = {};
  sortCategories.forEach((i, index) => s[i] = sortOptions[index])
  return s;
})();

// console.log(data, checkboxes, selects);

export default class Heroes extends Component {
  state = {
    textFilter: '',
    showFilterModal: false,
    showSortModal: false,
    checkboxFilters: {},
    sortBy: '',
    sortOrder: '',
    render: [],
  }

  componentWillMount = () => {
    this.timer = null;
    const [
      textFilter,
      checkboxFilters,
      sortBy,
      sortOrder,
    ] = parseURL(checkboxes, selects[sortCategories[0]], selects[sortCategories[1]]);

    // make easter egg not url linkable
    checkboxFilters.Hero.Real = true;
    checkboxFilters.Hero['Easter Egg'] = false;

    // update url since querystring may have contained bad values
    updateURL(
      textFilter,
      checkboxFilters,
      sortBy,
      sortOrder,
      selects[sortCategories[0]],
      selects[sortCategories[1]]
    );

    const processed = sortBySelection(
      filterByCheckbox(filterByText(data, textFilter), checkboxFilters),
      sortBy,
      selects[sortCategories[1]][0] === sortOrder,
      selects[sortCategories[0]][0]
    );
    const render = processed.map(i => this.renderListGroupItem(i, sortBy));

    this.setState({textFilter, checkboxFilters, sortBy, sortOrder, render,});
  }

  componentWillReceiveProps = () => {
    this.componentWillMount();
  }

  renderListGroupItem = (hero, sortBy) => {
    const id = [hero.name, hero.filterable.Star, hero.filterable.Class,];
    return (
      <LinkContainer key={id.join('')} to={`/cqdb/heroes/${id.join('&')}`}>
        <ListGroupItem>
          <Media>
            <Grid fluid>
              <Row>
                <Col style={{padding: 0,}} lg={3} md={3} sm={4} xs={5}>
                  <Media.Left style={{display: 'flex', justifyContent: 'center',}}>
                    <img alt='' src={imagePath(`heroes/${hero.image}`)} />
                  </Media.Left>
                </Col>
                <Col style={{padding: 0,}} lg={9} md={9} sm={8} xs={7}>
                  <Media.Body>
                    <Media.Heading>{`${hero.name} (${hero.filterable.Star}★)`}</Media.Heading>
                    {Object.values(hero.filterable).slice(1, 5).join(' | ')}
                    {statLabels.includes(sortBy) ? [<p key={id.join('')} />, `${sortBy}: ${hero.sortable[sortBy]}`] : ''}
                  </Media.Body>
                </Col>
              </Row>
            </Grid>
          </Media>
        </ListGroupItem>
      </LinkContainer>
    );
  }

  update = () => {
    updateURL(
      this.state.textFilter,
      this.state.checkboxFilters,
      this.state.sortBy,
      this.state.sortOrder,
      selects[sortCategories[0]],
      selects[sortCategories[1]]
    );
    const processed = sortBySelection(
      filterByCheckbox(filterByText(data, this.state.textFilter), this.state.checkboxFilters),
      this.state.sortBy,
      selects[sortCategories[1]][0] === this.state.sortOrder,
      selects[sortCategories[0]][0]
    );

    this.setState({ render: processed.map(i => this.renderListGroupItem(i, this.state.sortBy)), });
  }

  handleTextChange = (e) => {
    if (e.target.value.includes('\n')) { return; }

    clearTimeout(this.timer);
    this.setState({ textFilter: e.target.value, }, () => {
      this.timer = setTimeout(() => this.update(), 300);
    });
  }

  handleCheckbox = (e) => {
    const [key, value] = e.target.name.split('&');
    const checkboxFilters = this.state.checkboxFilters;
    checkboxFilters[key][value] = e.target.checked;

    this.setState({ checkboxFilters: checkboxFilters,}, () => this.update());
  }

  handleFilterButton = () => {
    this.setState({ showFilterModal: !this.state.showFilterModal, });
  }

  handleSortButton = () => {
    this.setState({ showSortModal: !this.state.showSortModal, });
  }

  handleSortByChange = (e) => {
    this.setState({ sortBy: e.target.value, }, () => this.update());
  }

  handleSortOrderChange = (e) => {
    this.setState({ sortOrder: e.target.value, }, () => this.update());
  }

  render = () => {
    const numCheckboxFilters = countFilters(this.state.checkboxFilters);
    return (
      <Row>
        {renderTextArea(this.handleTextChange, this.state.textFilter)}
        <Col style={{paddingRight: 2.5,}} lg={2} md={3} sm={6} xs={6}>
          <Button block onClick={this.handleFilterButton} style={{marginBottom: 5,}}>
            {'Filter' + (!numCheckboxFilters ? '' : ` (${numCheckboxFilters})`)}
          </Button>
        </Col>
        <Col style={{paddingLeft: 2.5,}} lg={2} md={3} sm={6} xs={6}>
          <Button block onClick={this.handleSortButton} style={{marginBottom: 5,}}>
            Sort
          </Button>
        </Col>
        {renderModal(
          this.handleFilterButton,
          this.state.showFilterModal,
          'Filters',
          renderCheckboxes(this.handleCheckbox, this.state.checkboxFilters, checkboxes)
        )}
        {renderModal(
          this.handleSortButton,
          this.state.showSortModal,
          'Sort',
          renderSelects([this.handleSortByChange, this.handleSortOrderChange,], [this.state.sortBy, this.state.sortOrder,], selects)
        )}
        {renderResults('Heroes', this.state.render)}
      </Row>
    );
  }
}
