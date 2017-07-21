import React, { Component, } from 'react';
import ReactList from 'react-list';
import {
  Checkbox,
  Col,
  ControlLabel,
  Form,
  FormControl,
  FormGroup,
  Grid,
  ListGroup,
  ListGroupItem,
  Media,
  Panel,
  Row,
} from 'react-bootstrap';

import { filterItems, filterNames, } from '../util/filters';
import { imagePath, } from '../util/imagePath';
import { initializeFilters, } from '../util/initializeFilters';
import { resolve, } from '../util/resolve';
import { updateURL, } from '../util/updateURL';
const data = require('../Decrypted/get_addstatitem.json').addstatitem;

let checkboxes = {};

export default class Berries extends Component {
  state = {
    filters: {},
    items: [],
    nameFilter: '',
    render: [],
  }

  componentWillMount = () => {
    const items = this.initializeItems();
    const [nameFilter, filters] = initializeFilters(checkboxes);
    const render = filterItems(filterNames(nameFilter, items), filters);
    this.setState({ filters, items, nameFilter, render, });
  }

  componentWillReceiveProps = () => {
    const [nameFilter, filters] = initializeFilters(checkboxes);
    const render = filterItems(filterNames(nameFilter, this.state.items), filters);
    this.setState({ filters, nameFilter, render, });
  }

  initializeItems = () => {
    const unique = {};
    const category = ['Star', 'Rate', 'Type',];
    category.forEach(i => unique[i] = {});

    const processedData = data.map(i => {
      const name = resolve(i.name);
      const star = i.grade.toString();
      const type = resolve(i.type_name);
      const value = i.add_stat_point <= 1
        ? parseInt(i.add_stat_point * 100, 10)
        : i.add_stat_point;
      const percentage = i.category === 'All' || i.type.includes('Ratio')
        ? '%'
        : '';
      const rate = `${parseInt(i.great_prob * 100, 10)}%`;
      const sell = i.sell_price;
      const eat = i.eat_price;
      const image = i.texture;

      const filters = [name, star, rate, type,];
      category.forEach((i, index) => unique[i][filters[index + 1]] = true);
      const listItem = (
        <ListGroupItem key={i.id}>
          <Media>
            <Grid fluid>
              <Row>
                <Col style={{padding: 0,}} lg={2} md={3} sm={4} xs={5}>
                  <Media.Left style={{display: 'flex', justifyContent: 'center',}}>
                    <img alt='' src={imagePath('cq-assets', `berries/${image}.png`)} />
                  </Media.Left>
                </Col>
                <Col style={{padding: 0,}} lg={10} md={9} sm={8} xs={7}>
                  <Media.Body>
                    <Media.Heading>{`${name} (${star}★)`}</Media.Heading>
                    <p>{`${value}${percentage} | ${rate} | Sell: ${sell} gold | Eat: ${eat} gold`}</p>
                  </Media.Body>
                </Col>
              </Row>
            </Grid>
          </Media>
        </ListGroupItem>
      );

      return [filters, listItem];
    });

    Object.keys(unique).forEach(i => {
      checkboxes[i] = Object.keys(unique[i]).sort((a, b) => (
        a.substring(0, a.length - 1) - b.substring(0, b.length - 1)
      ));
    });

    return processedData;
  }

  handleChange = (e) => {
    this.setState({
      nameFilter: e.target.value,
      render: filterItems(filterNames(e.target.value, this.state.items), this.state.filters),
    }, () => updateURL(this.state.nameFilter, this.state.filters));
  }

  handleCheckbox = (e) => {
    const arr = e.target.name.split('&');
    const filters = this.state.filters;
    filters[arr[0]][arr[1]] = e.target.checked;

    this.setState({
      filters: filters,
      render: filterItems(filterNames(this.state.nameFilter, this.state.items), filters),
    }, () => updateURL(this.state.nameFilter, this.state.filters));
  }

  renderCheckbox = (key, value) => {
    const isChecked = this.state.filters[key][value];
    return (
      <Checkbox defaultChecked={isChecked} inline key={`${value}${isChecked}`} name={`${key}&${value}`} onChange={this.handleCheckbox}>
        {value}
      </Checkbox>
    );
  }

  renderCheckboxes = () => {
    return (
      Object.keys(checkboxes).map(i => (
        <FormGroup key={i}>
          <Col componentClass={ControlLabel} lg={1} md={2} sm={2} xs={12}>{i}</Col>
          <Col lg={11} md={10} sm={10} xs={12}>
            {checkboxes[i].map(j => this.renderCheckbox(i, j))}
          </Col>
        </FormGroup> 
      ))
    );
  }

  render = () => {
    return (
      <Row>
        <Col lg={12} md={12} sm={12} xs={12}>
          <Panel collapsible defaultExpanded header='Filters'>
            <Form horizontal>
              <FormGroup>
                <Col componentClass={ControlLabel} lg={1} md={2} sm={2} xs={12}>Name</Col>
                <Col lg={11} md={10} sm={10} xs={12}>
                  <FormControl
                    onChange={this.handleChange}
                    type='text'
                    value={this.state.nameFilter}
                  />
                </Col>
              </FormGroup>
              {this.renderCheckboxes()}
            </Form>
          </Panel>
          <Panel collapsible defaultExpanded header={`Berries (${this.state.render.length})`}>
            <ListGroup fill>
              <ReactList
                itemRenderer={i => this.state.render[i]}
                length={this.state.render.length}
                minSize={10}
              />
            </ListGroup>
          </Panel>
        </Col>
      </Row>
    );
  }
}
